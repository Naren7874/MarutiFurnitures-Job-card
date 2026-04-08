import { ProductionStage } from '../../models/ProductionStage.js';
import { QcStage } from '../../models/QcStage.js';
import JobCard from '../../models/JobCard.js';
import { auditLog } from '../../utils/auditLogger.js';

/** GET /api/jobcards/:id/production */
export const getProduction = async (req, res, next) => {
  try {
    const stage = await ProductionStage.findOne({ jobCardId: req.params.id }).lean();
    if (!stage) return res.status(404).json({ success: false, message: 'Production stage not found' });
    res.status(200).json({ success: true, data: stage });
  } catch (err) { next(err); }
};

/** POST /api/jobcards/:id/production/start — Transition from active to in_production */
export const startProduction = async (req, res, next) => {
  try {
    const jobCard = await JobCard.findOne({ _id: req.params.id, companyId: req.user.companyId });
    
    if (!jobCard) {
      return res.status(404).json({ success: false, message: 'Job Card not found' });
    }

    // IDEMPOTENCY CHECK: If production stage already exists, don't error, just fix the JC and return it
    const existingStage = await ProductionStage.findOne({ jobCardId: jobCard._id });
    if (existingStage) {
      if (jobCard.status === 'active') {
        jobCard.status = 'in_production';
        jobCard.productionStageId = existingStage._id;
        await jobCard.save();
      }
      return res.status(200).json({ success: true, data: existingStage, message: 'Production already started' });
    }
    
    if (jobCard.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        message: `Only active Job Cards can start production. Current status: ${jobCard.status}` 
      });
    }

    // Default 8 sub-stages (must match ProductionStage.js enum names EXACTLY)
    const defaultSubstages = [
      { name: 'cutting',           status: 'pending' },
      { name: 'edge_banding',      status: 'pending' },
      { name: 'cnc_drilling',      status: 'pending' },
      { name: 'assembly',          status: 'pending' },
      { name: 'polishing',         status: 'pending' },
      { name: 'finishing',         status: 'pending' },
      { name: 'hardware_fitting',  status: 'pending' },
      { name: 'packing',           status: 'pending' },
    ];

    const prodStage = await ProductionStage.create({
      companyId: req.user.companyId,
      jobCardId: jobCard._id,
      projectId: jobCard.projectId,
      substages: defaultSubstages,
    });

    jobCard.status = 'in_production';
    jobCard.productionStageId = prodStage._id;
    jobCard.activityLog.push({
      action: 'production_started',
      doneBy: req.user.userId,
      prevStatus: 'active',
      newStatus: 'in_production',
      note: 'Started production phase directly from active stage',
      timestamp: new Date(),
    });

    await jobCard.save();

    auditLog(req, {
      action: 'update',
      resourceType: 'JobCard',
      resourceId: jobCard._id,
      resourceLabel: jobCard.jobCardNumber,
      changes: { status: { from: 'active', to: 'in_production' } },
      metadata: { action: 'production_started', productionStageId: prodStage._id },
    });

    res.status(200).json({ success: true, data: prodStage, message: 'Production started successfully' });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/jobcards/:id/production/substage — Mark a substage done */
export const updateSubstage = async (req, res, next) => {
  try {
    const { name, status, workerName, notes } = req.body;

    const stage = await ProductionStage.findOneAndUpdate(
      { jobCardId: req.params.id, 'substages.name': name },
      {
        $set: {
          'substages.$.status':      status,
          'substages.$.workerName':  workerName,
          'substages.$.notes':       notes,
          'substages.$.startedAt':   status === 'in_progress' ? new Date() : undefined,
          'substages.$.completedAt': status === 'done' ? new Date() : undefined,
        },
      },
      { new: true }
    );
    if (!stage) return res.status(404).json({ success: false, message: 'Production stage or substage not found' });

    auditLog(req, {
      action: 'update',
      resourceType: 'ProductionStage',
      resourceId: stage._id,
      resourceLabel: req.params.id,
      changes: { [`substage.${name}.status`]: { from: undefined, to: status } },
      metadata: { substageName: name, workerName },
    });

    // WhatsApp Hook (Dormant until ready)
    // await sendWhatsAppBulk(['91xxxxxxxxxx'], WA_TEMPLATES.SUBSTAGE_COMPLETE, [name, stage.jobCardId, status]);

    res.status(200).json({ success: true, data: stage });
  } catch (err) { next(err); }
};

/** POST /api/jobcards/:id/production/note — Add progress note */
export const addProgressNote = async (req, res, next) => {
  try {
    const stage = await ProductionStage.findOneAndUpdate(
      { jobCardId: req.params.id },
      { $push: { progressNotes: { note: req.body.note, addedBy: req.user.userId, addedAt: new Date() } } },
      { new: true }
    );
    if (!stage) return res.status(404).json({ success: false, message: 'Production stage not found' });

    auditLog(req, {
      action: 'update',
      resourceType: 'ProductionStage',
      resourceId: stage._id,
      resourceLabel: req.params.id,
      metadata: { action: 'progress_note_added', note: req.body.note },
    });

    res.status(200).json({ success: true, data: stage });
  } catch (err) { next(err); }
};

/** PATCH /api/jobcards/:id/production/shortage — Flag material shortage */
export const flagShortage = async (req, res, next) => {
  try {
    const { shortageNote } = req.body;
    const stage = await ProductionStage.findOneAndUpdate(
      { jobCardId: req.params.id },
      { materialShortage: true, shortageNote },
      { new: true }
    );
    if (!stage) return res.status(404).json({ success: false, message: 'Production stage not found' });

    auditLog(req, {
      action: 'update',
      resourceType: 'ProductionStage',
      resourceId: stage._id,
      resourceLabel: req.params.id,
      metadata: { action: 'material_shortage_flagged', shortageNote: req.body.shortageNote },
    });

    res.status(200).json({ success: true, data: stage });
  } catch (err) { next(err); }
};

/** PATCH /api/jobcards/:id/production/done — All done → create QcStage */
export const markProductionDone = async (req, res, next) => {
  try {
    const stage = await ProductionStage.findOneAndUpdate(
      { jobCardId: req.params.id },
      { status: 'done', actualCompletion: new Date(), completedBy: req.user.userId },
      { new: true }
    );
    if (!stage) return res.status(404).json({ success: false, message: 'Production stage not found' });

    // Auto-create or recycle QC Stage
    let qcStage = await QcStage.findOne({ jobCardId: stage.jobCardId });
    if (!qcStage) {
      qcStage = await QcStage.create({
        companyId: stage.companyId,
        jobCardId: stage.jobCardId,
        projectId: stage.projectId,
        checklist: [
          { parameter: 'Dimensions',           passed: null },
          { parameter: 'Finish Quality',        passed: null },
          { parameter: 'Hardware Fitting',      passed: null },
          { parameter: 'Structural Integrity',  passed: null },
          { parameter: 'Laminate / Polish',     passed: null },
        ],
      });
    } else {
      // Reset for the new review cycle
      qcStage.verdict = undefined;
      qcStage.checklist.forEach(c => {
        c.passed = null;
        c.notes = '';
      });
      await qcStage.save();
    }

    const jobCard = await JobCard.findById(stage.jobCardId);
    jobCard.status    = 'qc_pending';
    jobCard.qcStageId = qcStage._id;
    await jobCard.save();

    await JobCard.findByIdAndUpdate(stage.jobCardId, {
      $push: { activityLog: { action: 'production_done', doneBy: req.user.userId, prevStatus: 'in_production', newStatus: 'qc_pending', timestamp: new Date() } },
    });

    auditLog(req, {
      action: 'update',
      resourceType: 'JobCard',
      resourceId: stage.jobCardId,
      resourceLabel: req.params.id,
      changes: { status: { from: 'in_production', to: 'qc_pending' } },
      metadata: { action: 'production_done_qc_created', qcStageId: qcStage._id },
    });

    res.status(200).json({ success: true, data: { stage, qcStage } });
  } catch (err) { next(err); }
};

/** PATCH /api/jobcards/:id/production/reset — Reset substages for rework */
export const resetProduction = async (req, res, next) => {
  try {
    const stage = await ProductionStage.findOne({ jobCardId: req.params.id });
    if (!stage) return res.status(404).json({ success: false, message: 'Production stage not found' });

    // Reset substages to pending
    stage.substages.forEach(s => {
      s.status = 'pending';
      s.workerName = '';
      s.startedAt = undefined;
      s.completedAt = undefined;
    });
    
    // Clear overall production status
    stage.status = 'in_progress';
    stage.materialShortage = false;
    stage.shortageNote = '';

    await stage.save();

    await JobCard.findByIdAndUpdate(req.params.id, {
      status: 'in_production',
      $push: { 
        activityLog: { 
          action: 'production_reset', 
          doneBy: req.user.userId, 
          prevStatus: 'qc_failed',
          newStatus: 'in_production',
          note: 'Production substages reset for rework cycle', 
          timestamp: new Date() 
        } 
      },
    });

    auditLog(req, {
      action: 'update',
      resourceType: 'ProductionStage',
      resourceId: stage._id,
      resourceLabel: req.params.id,
      changes: { 'jobCard.status': { from: 'qc_failed', to: 'in_production' } },
      metadata: { action: 'production_reset_for_rework' },
    });

    res.status(200).json({ success: true, data: stage, message: 'Production substages reset successfully' });
  } catch (err) { next(err); }
};
