import JobCard from '../../models/JobCard.js';
import DesignRequest from '../../models/DesignRequest.js';
import { StoreStage } from '../../models/StoreStage.js';
import { uploadReqFiles } from '../../middleware/upload.js';
import { sendWhatsApp, WA_TEMPLATES } from '../../utils/sendWhatsApp.js';
import { auditLog } from '../../utils/auditLogger.js';
import { notifyDepartment } from '../../utils/notifications.js';

/** GET /api/jobcards/:id/design */
export const getDesign = async (req, res, next) => {
  try {
    const design = await DesignRequest.findOne({ jobCardId: req.params.id })
      .populate('assignedTo', 'name role')
      .lean();
    if (!design) return res.status(404).json({ success: false, message: 'Design request not found' });
    res.status(200).json({ success: true, data: design });
  } catch (err) { next(err); }
};

/** POST /api/jobcards/:id/design — Create design request */
export const createDesign = async (req, res, next) => {
  try {
    const jobCard = await JobCard.findOne({ _id: req.params.id, ...req.companyFilter });
    if (!jobCard) return res.status(404).json({ success: false, message: 'Job card not found' });

    if (jobCard.designRequestId) {
      return res.status(400).json({ success: false, message: 'Design request already exists for this job card' });
    }

    const design = await DesignRequest.create({
      companyId:  req.user.companyId,
      jobCardId:  jobCard._id,
      projectId:  jobCard.projectId,
      clientId:   jobCard.clientId,
      assignedTo: req.body.assignedTo || [],
      items:      req.body.items || [],
      createdBy:  req.user.userId,
    });

    // Link back to job card
    jobCard.designRequestId = design._id;
    await jobCard.save();

    auditLog(req, {
      action: 'create',
      resourceType: 'DesignRequest',
      resourceId: design._id,
      resourceLabel: jobCard.jobCardNumber || req.params.id,
      metadata: { jobCardId: jobCard._id, assignedTo: req.body.assignedTo },
    });

    res.status(201).json({ success: true, data: design });
  } catch (err) { next(err); }
};

/** PUT /api/jobcards/:id/design — Update measurements + materials */
export const updateDesign = async (req, res, next) => {
  try {
    const PROTECTED = ['companyId', 'jobCardId', 'projectId', 'clientId', 'createdBy'];
    PROTECTED.forEach((f) => delete req.body[f]);

    const design = await DesignRequest.findOneAndUpdate(
      { jobCardId: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!design) return res.status(404).json({ success: false, message: 'Design request not found' });

    auditLog(req, {
      action: 'update',
      resourceType: 'DesignRequest',
      resourceId: design._id,
      resourceLabel: req.params.id,
      metadata: { action: 'design_details_updated' },
    });

    res.status(200).json({ success: true, data: design });
  } catch (err) { next(err); }
};

/** POST /api/jobcards/:id/design/files — Upload CAD/render files */
export const uploadDesignFiles = async (req, res, next) => {
  try {
    const uploaded = await uploadReqFiles(req, `${req.user.companyId}/design`);
    const fileDocs = uploaded.map((u, i) => ({
      title:      req.body.titles?.[i] || `File ${i + 1}`,
      url:        u.url,
      fileType:   req.body.fileTypes?.[i] || 'other',
      uploadedBy: req.user.userId,
    }));

    const design = await DesignRequest.findOneAndUpdate(
      { jobCardId: req.params.id },
      { $push: { files: { $each: fileDocs } } },
      { new: true }
    );
    if (!design) return res.status(404).json({ success: false, message: 'Design request not found' });

    auditLog(req, {
      action: 'update',
      resourceType: 'DesignRequest',
      resourceId: design._id,
      resourceLabel: req.params.id,
      metadata: { action: 'files_uploaded', fileCount: uploaded.length },
    });

    res.status(200).json({ success: true, data: design });
  } catch (err) { next(err); }
};

/** POST /api/jobcards/:id/design/signoff — Send client sign-off link */
export const sendSignoffLink = async (req, res, next) => {
  try {
    const { v4: uuidv4 } = await import('uuid');
    const token = uuidv4();

    const design = await DesignRequest.findOneAndUpdate(
      { jobCardId: req.params.id },
      { 'signoff.status': 'pending', 'signoff.sentAt': new Date(), signoffToken: token },
      { new: true }
    );
    if (!design) return res.status(404).json({ success: false, message: 'Design request not found' });

    const signoffUrl = `${process.env.FRONTEND_URL}/signoff/${token}`;

    auditLog(req, {
      action: 'update',
      resourceType: 'DesignRequest',
      resourceId: design._id,
      resourceLabel: req.params.id,
      metadata: { action: 'signoff_link_sent', signoffUrl },
    });

    res.status(200).json({ success: true, signoffUrl, data: design });
  } catch (err) { next(err); }
};

/** PATCH /api/jobcards/:id/design/ready — Mark design done → trigger Store stage */
export const markDesignReady = async (req, res, next) => {
  try {
    const jobCard = await JobCard.findOne({ _id: req.params.id, ...req.companyFilter });
    if (!jobCard) return res.status(404).json({ success: false, message: 'Job card not found' });

    // Update design status
    await DesignRequest.findOneAndUpdate(
      { jobCardId: req.params.id },
      { status: 'approved' }
    );

    // Create StoreStage document with initial BOM from JobCard items
    const storeStage = await StoreStage.create({
      companyId: req.user.companyId,
      jobCardId: jobCard._id,
      projectId: jobCard.projectId,
      status:    'pending',
      bom: (jobCard.items || []).map(item => ({
        materialName: item.description || `Item #${item.srNo}`,
        required: item.qty || 1,
        unit: item.unit || 'pcs',
        inStock: 0,
        shortage: item.qty || 1,
        issued: false
      }))
    });

    // Update job card
    jobCard.status       = 'in_store';
    jobCard.storeStageId = storeStage._id;
    await jobCard.save();

    // Activity log
    await JobCard.findByIdAndUpdate(jobCard._id, {
      $push: { activityLog: { action: 'design_ready', doneBy: req.user.userId, prevStatus: 'active', newStatus: 'in_store', timestamp: new Date() } },
    });

    // Notify Store Department
    await notifyDepartment(req.user.companyId, 'store', {
      type: 'status_changed',
      title: 'New Design Ready',
      message: `Job Card ${jobCard.jobCardNumber} is ready for material issuance.`,
      jobCardId: jobCard._id,
      projectId: jobCard.projectId,
    });

    // WhatsApp Hook (Dormant until ready)
    // await sendWhatsAppBulk(['91xxxxxxxxxx'], WA_TEMPLATES.DESIGN_READY, [jobCard.jobCardNumber, company.name]);

    auditLog(req, {
      action: 'update',
      resourceType: 'JobCard',
      resourceId: jobCard._id,
      resourceLabel: jobCard.jobCardNumber,
      changes: { status: { from: 'active', to: 'in_store' } },
      metadata: { action: 'design_approved_store_stage_created', storeStageId: storeStage._id },
    });

    res.status(200).json({ success: true, data: { jobCard, storeStage } });
  } catch (err) { next(err); }
};

/** GET /api/jobcards/signoff/:token — Public: client views design (no auth) */
export const getSignoffPage = async (req, res, next) => {
  try {
    const design = await DesignRequest.findOne({ signoffToken: req.params.token })
      .populate('jobCardId', 'jobCardNumber projectId')
      .populate({ path: 'jobCardId', populate: { path: 'projectId', select: 'projectName' } })
      .lean();
    if (!design) return res.status(404).json({ success: false, message: 'Signoff link is invalid or expired' });

    res.json({
      success: true,
      data: {
        files:          design.files || [],
        designerNotes:  design.designerNotes || '',
        projectName:    design.jobCardId?.projectId?.projectName || '',
        jobCardNumber:  design.jobCardId?.jobCardNumber || '',
        signoffStatus:  design.signoff?.status,
      },
    });
  } catch (err) { next(err); }
};

/** PATCH /api/jobcards/signoff/:token — Public: client approves/rejects design (no auth) */
export const submitSignoff = async (req, res, next) => {
  try {
    const { status, remarks } = req.body; // status: 'approved' | 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be approved or rejected' });
    }

    const design = await DesignRequest.findOne({ signoffToken: req.params.token });
    if (!design) return res.status(404).json({ success: false, message: 'Signoff link is invalid or expired' });
    if (design.signoff?.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'This sign-off has already been submitted' });
    }

    design.signoff = {
      status,
      remarks:     remarks || '',
      signedAt:    new Date(),
      clientIp:    req.ip,
    };
    await design.save();

    // Audit as the client (actor: { id, name, role, companyId })
    auditLog(req, {
      action: 'update',
      resourceType: 'DesignRequest',
      resourceId: design._id,
      resourceLabel: req.params.token,
      metadata: { action: 'client_signoff_submitted', status, remarks },
      actor: { 
        id: 'CLIENT', 
        name: 'Client', 
        role: 'external', 
        companyId: design.companyId 
      },
    });

    res.json({ success: true, message: `Design ${status} successfully`, data: { status } });
  } catch (err) { next(err); }
};
