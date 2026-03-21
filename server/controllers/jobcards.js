import JobCard from '../models/JobCard.js';
import Project from '../models/Project.js';
import Company from '../models/Company.js';
import Notification from '../models/Notification.js';
import DesignRequest from '../models/DesignRequest.js'; // Added import
import mongoose from 'mongoose';
import { generateJobCardNumber } from '../utils/autoNumber.js';
import { generateAndUploadPDF } from '../utils/generatePDF.js';
import { sendWhatsAppBulk, WA_TEMPLATES } from '../utils/sendWhatsApp.js';
import { auditLog } from '../utils/auditLogger.js';


// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Append an entry to the job card's immutable activity log.
 * @param {string}   jobCardId
 * @param {object}   entry - { action, doneBy, prevStatus, newStatus, note }
 */
const addActivityLog = (jobCardId, entry) =>
  JobCard.findByIdAndUpdate(jobCardId, {
    $push: { activityLog: { ...entry, timestamp: new Date() } },
  });

/**
 * Create a Notification document.
 */
const createNotification = (payload) => Notification.create(payload).catch(() => { });

// ── POST /api/jobcards ───────────────────────────────────────────────────────

export const createJobCard = async (req, res, next) => {
  try {
    const { projectId, title, items, priority, expectedDelivery, quotationId } = req.body;

    const project = await Project.findOne({ _id: projectId, ...req.companyFilter }).lean();
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const company = await Company.findById(req.user.companyId).lean();
    const jobCardNumber = await generateJobCardNumber(req.user.companyId, company.jobCardPrefix);

    const jobCard = await JobCard.create({
      companyId: req.user.companyId,
      jobCardNumber,
      projectId: project._id,
      clientId: project.clientId,
      quotationId,
      title,
      items: items || [],
      priority: priority || 'medium',
      expectedDelivery,
      orderDate: new Date(),
      status: 'active',
      whatsapp: project.whatsapp, // Inherit group from project
      activityLog: [{
        action: 'created',
        doneBy: req.user.userId,
        newStatus: 'active',
        note: `Job card created by ${req.user.userId}`,
        timestamp: new Date(),
      }],
      createdBy: req.user.userId,
    });

    // SRS §3.5: Auto-create DesignRequest
    const designRequest = await DesignRequest.create({
      companyId: req.user.companyId,
      jobCardId: jobCard._id,
      projectId: project._id,
      clientId: project.clientId,
      status: 'pending',
      createdBy: req.user.userId,
    });

    // Link DesignRequest back to JobCard
    jobCard.designRequestId = designRequest._id;
    await jobCard.save();

    // Send WhatsApp notification to the group
    if (project.whatsapp?.groupId) {
      // In practice, you'd send to all assigned staff phones
      // Here we enqueue the notification
      createNotification({
        companyId: req.user.companyId,
        recipientId: req.user.userId,
        projectId: project._id,
        jobCardId: jobCard._id,
        type: 'job_card_created',
        title: `Job Card Created: ${jobCardNumber}`,
        message: `Job Card ${jobCardNumber} created for ${project.projectName}. Priority: ${priority?.toUpperCase()}`,
        channel: 'whatsapp',
        waTemplateName: WA_TEMPLATES.JOB_CARD_CREATED,
        deliveryStatus: 'pending',
      });
    }

    res.status(201).json({ success: true, data: jobCard });

    // Fire-and-forget audit log after response
    auditLog(req, {
      action: 'create',
      resourceType: 'JobCard',
      resourceId: jobCard._id,
      resourceLabel: jobCardNumber,
      metadata: { projectId: project._id, projectName: project.projectName, priority },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/jobcards ────────────────────────────────────────────────────────

export const getJobCards = async (req, res, next) => {
  try {
    const { status, priority, projectId, clientId, quotationId, search, page = 1, limit = 20 } = req.query;
    const filter = { ...req.companyFilter };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (projectId) filter.projectId = projectId;
    if (clientId) filter.clientId = clientId;
    if (quotationId) filter.quotationId = new mongoose.Types.ObjectId(quotationId);
    if (search) {
      filter.$or = [
        { jobCardNumber: new RegExp(search, 'i') },
        { title: new RegExp(search, 'i') },
      ];
    }

    // ── Department-level scoping ──────────────────────────────────────────
    // sales sees all (they manage quotations); super_admin bypasses via isSuperAdmin flag.
    // Every other role only sees job cards where they appear in assignedTo.<dept>.
    //
    // IMPORTANT: req.user.userId is a string from JWT. MongoDB stores ObjectIds in
    // assignedTo arrays. We must cast to ObjectId or the $in comparison will NEVER match.
    if (!req.user.isSuperAdmin && req.user.role !== 'sales') {
      const dept = req.user.department; // set directly from DB by auth.js middleware
      const VALID_DEPTS = ['design', 'store', 'production', 'qc', 'dispatch', 'accountant'];
      if (dept && VALID_DEPTS.includes(dept)) {
        const userOid = new mongoose.Types.ObjectId(req.user.userId);
        filter[`assignedTo.${dept}`] = { $in: [userOid] };
      }
    }


    const [jobCards, total] = await Promise.all([
      JobCard.find(filter)
        .populate('clientId', 'name firmName city')
        .populate('projectId', 'projectName projectNumber')
        .populate('quotationId', 'grandTotal')
        .select('-activityLog') // Don't return full log on list
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      JobCard.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: jobCards,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/jobcards/:id ────────────────────────────────────────────────────

export const getJobCardById = async (req, res, next) => {
  try {
    const jobCard = await JobCard.findOne({ _id: req.params.id, ...req.companyFilter })
      .populate('clientId')
      .populate('projectId', 'projectName projectNumber whatsapp')
      .populate('quotationId', 'quotationNumber grandTotal')
      .populate('assignedTo.design', 'name role')
      .populate('assignedTo.store', 'name role')
      .populate('assignedTo.production', 'name role')
      .populate('assignedTo.qc', 'name role')
      .populate('assignedTo.dispatch', 'name role')
      .populate('assignedTo.accountant', 'name role')
      .lean();

    if (!jobCard) return res.status(404).json({ success: false, message: 'Job card not found' });
    res.status(200).json({ success: true, data: jobCard });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/jobcards/:id (edit details) ─────────────────────────────────────

export const updateJobCard = async (req, res, next) => {
  try {
    const { title, priority, expectedDelivery, items, contactPerson } = req.body;

    const jobCard = await JobCard.findOne({ _id: req.params.id, ...req.companyFilter });
    if (!jobCard) return res.status(404).json({ success: false, message: 'Job card not found' });

    // Ensure we aren't editing a closed/cancelled job card
    if (['closed', 'cancelled'].includes(jobCard.status)) {
      return res.status(400).json({ success: false, message: `Cannot edit a ${jobCard.status} job card` });
    }

    const prev = jobCard.toObject();
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (priority !== undefined) updates.priority = priority;
    if (expectedDelivery !== undefined) updates.expectedDelivery = expectedDelivery;
    if (items !== undefined) updates.items = items;
    if (contactPerson !== undefined) updates.contactPerson = contactPerson;

    // Apply updates
    Object.assign(jobCard, updates);
    await jobCard.save();

    await addActivityLog(jobCard._id, {
      action: 'edited',
      doneBy: req.user.userId,
      newStatus: jobCard.status,
      note: 'Job card details updated',
    });

    // Compute changed fields for audit log
    const changedFields = {};
    const tracked = ['title', 'priority', 'expectedDelivery'];
    tracked.forEach(f => {
      if (updates[f] !== undefined && String(prev[f]) !== String(jobCard[f])) {
        changedFields[f] = { from: prev[f], to: jobCard[f] };
      }
    });

    auditLog(req, {
      action: 'update',
      resourceType: 'JobCard',
      resourceId: jobCard._id,
      resourceLabel: jobCard.jobCardNumber,
      changes: Object.keys(changedFields).length ? changedFields : undefined,
      metadata: { action: 'jobcard_edited' },
    });

    res.status(200).json({ success: true, data: jobCard });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/jobcards/:id/status (admin override) ─────────────────────────

export const updateStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const jobCard = await JobCard.findOne({ _id: req.params.id, ...req.companyFilter });
    if (!jobCard) return res.status(404).json({ success: false, message: 'Job card not found' });

    const prevStatus = jobCard.status;
    jobCard.status = status;
    await jobCard.save();

    await addActivityLog(jobCard._id, {
      action: 'status_override',
      doneBy: req.user.userId,
      prevStatus,
      newStatus: status,
      note: note || 'Admin status override',
    });

    auditLog(req, {
      action: 'update',
      resourceType: 'JobCard',
      resourceId: jobCard._id,
      resourceLabel: jobCard.jobCardNumber,
      changes: { status: { from: prevStatus, to: status } },
      metadata: { action: 'admin_status_override', note },
    });

    res.status(200).json({ success: true, data: jobCard });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/jobcards/:id/hold ─────────────────────────────────────────────

export const holdJobCard = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Reason is required for hold' });

    const jobCard = await JobCard.findOne({ _id: req.params.id, ...req.companyFilter });
    if (!jobCard) return res.status(404).json({ success: false, message: 'Job card not found' });

    const prevStatus = jobCard.status;
    jobCard.status = 'on_hold';
    jobCard.onHoldReason = reason;
    await jobCard.save();

    await addActivityLog(jobCard._id, {
      action: 'on_hold',
      doneBy: req.user.userId,
      prevStatus,
      newStatus: 'on_hold',
      note: reason,
    });

    auditLog(req, {
      action: 'update',
      resourceType: 'JobCard',
      resourceId: jobCard._id,
      resourceLabel: jobCard.jobCardNumber,
      changes: { status: { from: prevStatus, to: 'on_hold' } },
      metadata: { reason },
    });

    res.status(200).json({ success: true, data: jobCard });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/jobcards/:id/cancel ───────────────────────────────────────────

export const cancelJobCard = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Reason is required for cancellation' });

    const jobCard = await JobCard.findOne({ _id: req.params.id, ...req.companyFilter });
    if (!jobCard) return res.status(404).json({ success: false, message: 'Job card not found' });

    const prevStatus = jobCard.status;
    jobCard.status = 'cancelled';
    jobCard.cancelReason = reason;
    await jobCard.save();

    await addActivityLog(jobCard._id, {
      action: 'cancelled',
      doneBy: req.user.userId,
      prevStatus,
      newStatus: 'cancelled',
      note: reason,
    });

    auditLog(req, {
      action: 'delete',
      resourceType: 'JobCard',
      resourceId: jobCard._id,
      resourceLabel: jobCard.jobCardNumber,
      changes: { status: { from: prevStatus, to: 'cancelled' } },
      metadata: { reason },
    });

    res.status(200).json({ success: true, data: jobCard });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/jobcards/:id/close ────────────────────────────────────────────

export const closeJobCard = async (req, res, next) => {
  try {
    const { warrantyNotes, punchListItems } = req.body;

    const jobCard = await JobCard.findOne({
      _id: req.params.id,
      ...req.companyFilter,
      status: 'delivered',   // Can only close after delivery
    });
    if (!jobCard) {
      return res.status(404).json({
        success: false,
        message: 'Job card not found or not in delivered status',
      });
    }

    jobCard.status = 'closed';
    jobCard.warrantyNotes = warrantyNotes;
    jobCard.punchListItems = punchListItems || [];
    jobCard.closedBy = req.user.userId;
    jobCard.actualDelivery = jobCard.actualDelivery || new Date();
    await jobCard.save();

    await addActivityLog(jobCard._id, {
      action: 'closed',
      doneBy: req.user.userId,
      prevStatus: 'delivered',
      newStatus: 'closed',
      note: 'Job card closed and archived',
    });

    auditLog(req, {
      action: 'update',
      resourceType: 'JobCard',
      resourceId: jobCard._id,
      resourceLabel: jobCard.jobCardNumber,
      changes: { status: { from: 'delivered', to: 'closed' } },
      metadata: { warrantyNotes: !!warrantyNotes, punchListItems: punchListItems?.length || 0 },
    });

    res.status(200).json({ success: true, data: jobCard });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/jobcards/:id/pdf ────────────────────────────────────────────────

export const getJobCardPDF = async (req, res, next) => {
  try {
    const jobCard = await JobCard.findOne({ _id: req.params.id, ...req.companyFilter })
      .populate('clientId', 'name firmName phone')
      .populate('projectId', 'projectName siteAddress')
      .lean();
    if (!jobCard) return res.status(404).json({ success: false, message: 'Job card not found' });

    const company = await Company.findById(req.user.companyId).lean();
    const { renderPDF } = await import('../utils/generatePDF.js');

    const pdfBuffer = await renderPDF('jobcard', {
      company,
      client: jobCard.clientId || {},
      jobCard,
    });

    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${jobCard.jobCardNumber}.pdf"` });
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/jobcards/:id/assign — Assign/Reassign staff ─────────────────

export const assignJobCard = async (req, res, next) => {
  try {
    const { stage, userIds } = req.body; // stage: 'design' | 'store' | 'production' | etc.
    const VALID_STAGES = ['design', 'store', 'production', 'qc', 'dispatch', 'accountant'];

    if (!VALID_STAGES.includes(stage)) {
      return res.status(400).json({ success: false, message: 'Invalid stage for assignment' });
    }

    const jobCard = await JobCard.findOne({ _id: req.params.id, ...req.companyFilter });
    if (!jobCard) return res.status(404).json({ success: false, message: 'Job card not found' });

    const prevAssigned = jobCard.assignedTo[stage] || [];
    jobCard.assignedTo[stage] = userIds;
    await jobCard.save();

    // If design stage is assigned, sync with DesignRequest if it exists
    if (stage === 'design' && jobCard.designRequestId) {
      // Lazy import to avoid circular dependency
      const DesignRequest = mongoose.model('DesignRequest');
      await DesignRequest.findByIdAndUpdate(jobCard.designRequestId, {
        assignedTo: userIds,
      });
    }

    await addActivityLog(jobCard._id, {
      action: 'staff_assigned',
      doneBy: req.user.userId,
      newStatus: jobCard.status,
      note: `Assigned staff to ${stage} stage`,
    });

    auditLog(req, {
      action: 'update',
      resourceType: 'JobCard',
      resourceId: jobCard._id,
      resourceLabel: jobCard.jobCardNumber,
      metadata: { action: 'staff_assigned', stage, userIds, prevAssignedCount: prevAssigned.length },
    });

    res.status(200).json({ success: true, data: jobCard });
  } catch (err) {
    next(err);
  }
};
