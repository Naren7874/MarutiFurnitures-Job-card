import { QcStage } from '../../models/QcStage.js';
import { DispatchStage } from '../../models/DispatchStage.js';
import JobCard from '../../models/JobCard.js';
import { generateAndUploadPDF } from '../../utils/generatePDF.js';
import { uploadReqFiles } from '../../middleware/upload.js';
import { auditLog } from '../../utils/auditLogger.js';

/** GET /api/jobcards/:id/qc */
export const getQC = async (req, res, next) => {
  try {
    const stage = await QcStage.findOne({ jobCardId: req.params.id }).lean();
    if (!stage) return res.status(404).json({ success: false, message: 'QC stage not found' });
    res.status(200).json({ success: true, data: stage });
  } catch (err) { next(err); }
};

/** PUT /api/jobcards/:id/qc/checklist — Save checklist answers */
export const updateChecklist = async (req, res, next) => {
  try {
    const stage = await QcStage.findOneAndUpdate(
      { jobCardId: req.params.id },
      { checklist: req.body.checklist, inspectedBy: req.user.userId },
      { new: true }
    );
    if (!stage) return res.status(404).json({ success: false, message: 'QC stage not found' });

    auditLog(req, {
      action: 'update',
      resourceType: 'QcStage',
      resourceId: stage._id,
      resourceLabel: req.params.id,
      metadata: { action: 'checklist_updated' },
    });

    res.status(200).json({ success: true, data: stage });
  } catch (err) { next(err); }
};

/** POST /api/jobcards/:id/qc/defect-photos — Upload defect photos */
export const uploadDefectPhotos = async (req, res, next) => {
  try {
    const uploaded = await uploadReqFiles(req, `${req.user.companyId}/qc`);
    const photos = uploaded.map((u, i) => ({
      url:        u.url,
      annotation: req.body.annotations?.[i] || '',
      uploadedAt: new Date(),
    }));

    const stage = await QcStage.findOneAndUpdate(
      { jobCardId: req.params.id },
      { $push: { defectPhotos: { $each: photos } } },
      { new: true }
    );
    if (!stage) return res.status(404).json({ success: false, message: 'QC stage not found' });

    auditLog(req, {
      action: 'update',
      resourceType: 'QcStage',
      resourceId: stage._id,
      resourceLabel: req.params.id,
      metadata: { action: 'defect_photos_uploaded', photoCount: photos.length },
    });

    res.status(200).json({ success: true, data: stage });
  } catch (err) { next(err); }
};

/** PATCH /api/jobcards/:id/qc/pass — QC pass → create DispatchStage */
export const passQC = async (req, res, next) => {
  try {
    const stage = await QcStage.findOne({ jobCardId: req.params.id });
    if (!stage) return res.status(404).json({ success: false, message: 'QC stage not found' });

    stage.verdict     = 'pass';
    stage.inspectedBy = req.user.userId;

    // Generate QC certificate PDF
    const certUrl = await generateAndUploadPDF(
      'qc-certificate',
      { JC_NUMBER: req.params.id, VERDICT: 'PASS', DATE: new Date().toLocaleDateString('en-IN') },
      `${req.user.companyId}/qc-certs`,
      `QC-CERT-${req.params.id}`
    ).catch(() => null);  // Don't fail if template not ready yet

    stage.certificateURL = certUrl;
    await stage.save();

    // Create Dispatch Stage
    const dispatchStage = await DispatchStage.create({
      companyId: stage.companyId,
      jobCardId: stage.jobCardId,
      projectId: stage.projectId,
      status:    'scheduled',
    });

    const jobCard = await JobCard.findById(stage.jobCardId);
    jobCard.status          = 'qc_passed';
    jobCard.dispatchStageId = dispatchStage._id;
    await jobCard.save();

    await JobCard.findByIdAndUpdate(stage.jobCardId, {
      $push: { activityLog: { action: 'qc_passed', doneBy: req.user.userId, prevStatus: 'qc_pending', newStatus: 'qc_passed', timestamp: new Date() } },
    });

    auditLog(req, {
      action: 'update',
      resourceType: 'JobCard',
      resourceId: stage.jobCardId,
      resourceLabel: req.params.id,
      changes: { status: { from: 'qc_pending', to: 'qc_passed' } },
      metadata: { action: 'qc_passed_dispatch_created', dispatchStageId: dispatchStage._id, certificateURL: stage.certificateURL },
    });

    res.status(200).json({ success: true, data: { stage, dispatchStage } });
  } catch (err) { next(err); }
};

/** PATCH /api/jobcards/:id/qc/fail — QC fail → rework */
export const failQC = async (req, res, next) => {
  try {
    const { defectSummary, failReason } = req.body;

    const stage = await QcStage.findOne({ jobCardId: req.params.id });
    if (!stage) return res.status(404).json({ success: false, message: 'QC stage not found' });

    stage.verdict = 'fail';
    stage.reworkCount = (stage.reworkCount || 0) + 1;
    stage.reworkHistory.push({ failReason, defectSummary, sentBackAt: new Date(), sentBackBy: req.user.userId });

    // Escalate if rework > 2
    if (stage.reworkCount > 2) stage.escalated = true;

    await stage.save();

    const jobCard = await JobCard.findById(stage.jobCardId);
    const prevStatus = jobCard.status;
    jobCard.status = 'in_production';  // Send back to production
    await jobCard.save();

    await JobCard.findByIdAndUpdate(stage.jobCardId, {
      $push: { activityLog: { action: 'qc_failed', doneBy: req.user.userId, prevStatus, newStatus: 'in_production', note: `Rework #${stage.reworkCount}: ${failReason}`, timestamp: new Date() } },
    });

    auditLog(req, {
      action: 'update',
      resourceType: 'JobCard',
      resourceId: stage.jobCardId,
      resourceLabel: req.params.id,
      changes: { status: { from: prevStatus, to: 'in_production' } },
      metadata: { action: 'qc_failed_sent_to_rework', reworkCount: stage.reworkCount, failReason, escalated: stage.escalated },
    });

    res.status(200).json({
      success: true,
      data: stage,
      escalated: stage.escalated,
      message: stage.escalated ? 'ESCALATED: rework count > 2, admin notified' : 'Sent back to production for rework',
    });
  } catch (err) { next(err); }
};
