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

    // Auto-create QC Stage
    const qcStage = await QcStage.create({
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
