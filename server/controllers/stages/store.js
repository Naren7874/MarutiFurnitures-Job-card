import { StoreStage } from '../../models/StoreStage.js';
import JobCard from '../../models/JobCard.js';
import { Inventory } from '../../models/Inventory.js';
import { ProductionStage } from '../../models/ProductionStage.js';
import { auditLog } from '../../utils/auditLogger.js';

/** GET /api/jobcards/:id/store — BOM with live inventory levels */
export const getStore = async (req, res, next) => {
  try {
    const store = await StoreStage.findOne({ jobCardId: req.params.id })
      .populate('bom.inventoryId', 'itemName currentStock unit')
      .populate('purchaseOrderIds', 'poNumber status')
      .lean();
    if (!store) return res.status(404).json({ success: false, message: 'Store stage not found' });
    res.status(200).json({ success: true, data: store });
  } catch (err) { next(err); }
};

/** POST /api/jobcards/:id/store/bom — Add/update BOM items */
export const updateBOM = async (req, res, next) => {
  try {
    const { bom } = req.body;  // Array of BOM item objects
    const store = await StoreStage.findOneAndUpdate(
      { jobCardId: req.params.id },
      { bom },
      { new: true }
    );
    if (!store) return res.status(404).json({ success: false, message: 'Store stage not found' });

    auditLog(req, {
      action: 'update',
      resourceType: 'StoreStage',
      resourceId: store._id,
      resourceLabel: req.params.id,
      metadata: { action: 'bom_updated', itemCount: bom?.length || 0 },
    });

    res.status(200).json({ success: true, data: store });
  } catch (err) { next(err); }
};

/** PATCH /api/jobcards/:id/store/issue/:bomItemId — Mark one BOM item issued */
export const issueBOMItem = async (req, res, next) => {
  try {
    const { issuedQty } = req.body;

    const store = await StoreStage.findOneAndUpdate(
      { jobCardId: req.params.id, 'bom._id': req.params.bomItemId },
      {
        $set: {
          'bom.$.issued':    issuedQty,
          'bom.$.issuedAt':  new Date(),
          'bom.$.issuedBy':  req.user.userId,
          'bom.$.shortage':  false,
        },
      },
      { new: true }
    );
    if (!store) return res.status(404).json({ success: false, message: 'Store stage or BOM item not found' });

    // Check if ALL items are now issued → progress to in_production
    const allIssued = store.bom.every((item) => item.issued >= item.required);
    if (allIssued) {
      await _triggerProduction(req.params.id, req.user, store);
    }

    auditLog(req, {
      action: 'update',
      resourceType: 'StoreStage',
      resourceId: store._id,
      resourceLabel: req.params.id,
      metadata: { action: 'bom_item_issued', bomItemId: req.params.bomItemId, issuedQty: req.body.issuedQty, allIssued },
    });

    res.status(200).json({ success: true, data: store, allIssued });
  } catch (err) { next(err); }
};

/** PATCH /api/jobcards/:id/store/issue-all — Mark all materials issued → trigger production */
export const issueAllMaterials = async (req, res, next) => {
  try {
    const store = await StoreStage.findOneAndUpdate(
      { jobCardId: req.params.id },
      { allMaterialsIssued: true, status: 'material_ready', issuedBy: req.user.userId, issuedAt: new Date() },
      { new: true }
    );
    if (!store) return res.status(404).json({ success: false, message: 'Store stage not found' });

    await _triggerProduction(req.params.id, req.user, store);

    auditLog(req, {
      action: 'update',
      resourceType: 'StoreStage',
      resourceId: store._id,
      resourceLabel: req.params.id,
      changes: { status: { from: 'pending', to: 'material_ready' } },
      metadata: { action: 'all_materials_issued_production_triggered' },
    });

    res.status(200).json({ success: true, data: store });
  } catch (err) { next(err); }
};

/** Internal: create ProductionStage + update JobCard status */
const _triggerProduction = async (jobCardId, user, store) => {
  // Create production stage
  const prodStage = await ProductionStage.create({
    companyId: store.companyId,
    jobCardId,
    projectId: store.projectId,
    substages: [
      { name: 'cutting',         status: 'pending' },
      { name: 'edge_banding',    status: 'pending' },
      { name: 'cnc_drilling',    status: 'pending' },
      { name: 'assembly',        status: 'pending' },
      { name: 'polishing',       status: 'pending' },
      { name: 'finishing',       status: 'pending' },
      { name: 'hardware_fitting',status: 'pending' },
      { name: 'packing',         status: 'pending' },
    ],
    status: 'pending',
  });

  const jobCard = await JobCard.findById(jobCardId);
  jobCard.status            = 'in_production';
  jobCard.productionStageId = prodStage._id;
  await jobCard.save();

  await JobCard.findByIdAndUpdate(jobCardId, {
    $push: { activityLog: { action: 'materials_issued', doneBy: user.userId, prevStatus: 'material_ready', newStatus: 'in_production', timestamp: new Date() } },
  });
};
