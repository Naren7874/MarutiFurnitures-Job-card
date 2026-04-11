import JobCard from '../models/JobCard.js';
import Project from '../models/Project.js';
import Company from '../models/Company.js';
import Notification from '../models/Notification.js';
import { Invoice } from '../models/Invoice.js';
import Quotation from '../models/Quotation.js';
import Client from '../models/Client.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { generateJobCardNumber, generateQuotationNumber, generateProjectNumber, generateInvoiceNumber } from '../utils/autoNumber.js';
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

// ── POST /api/jobcards/direct ───────────────────────────────────────────────

export const createDirectJobCard = async (req, res, next) => {
  try {
    const { 
      clientId, projectName, contactPerson, expectedDelivery, priority, 
      item, gstType, discount, advancePayment, assignedTo, salesperson 
    } = req.body;

    const [company, clientData] = await Promise.all([
      Company.findById(req.user.companyId).lean(),
      Client.findById(clientId).lean()
    ]);

    if (!clientData) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Role-based validation for production stage
    if (assignedTo?.production?.length > 0) {
      const prodStaff = await User.find({ _id: { $in: assignedTo.production } }).select('role');
      const hasNonManagers = prodStaff.some(u => {
        const r = u.role?.toLowerCase().replace(/[\s_]/g, '');
        return r !== 'factorymanager';
      });
      if (hasNonManagers) {
        return res.status(400).json({
          success: false,
          message: 'Direct creation failed: Only users with the Factory Manager role can be assigned to the production stage.'
        });
      }
    }

    // 1. Calculate Single Item Totals
    const qty = Number(item.qty) || 1;
    const rate = Number(item.sellingPrice) || 0;
    const itemTotal = qty * rate;
    const subtotal = itemTotal;
    const disc = Number(discount) || 0;
    const amountAfterDiscount = Math.max(0, subtotal - disc);
    
    const gstAmount = +(amountAfterDiscount * 0.18).toFixed(2);
    const grandTotal = +(amountAfterDiscount + gstAmount).toFixed(2);

    const advAmount = Number(advancePayment?.amount) || 0;

    // Build common item spec
    const builtItem = {
      srNo: 1,
      category: item.category || '',
      description: item.description || '',
      photo: item.photo || '',
      fabricPhoto: item.fabricPhoto || '',
      photos: item.photos || [],
      specifications: item.specifications || {},
      qty,
      unit: item.unit || 'pcs',
      mrp: item.mrp || 0,
      sellingPrice: rate,
      totalPrice: itemTotal,
    };

    // 2. Create Quotation (Auto-Approved)
    const quotationNumber = await generateQuotationNumber(req.user.companyId, company.quotationPrefix, clientData.name);
    
    const quotation = await Quotation.create({
      companyId: req.user.companyId,
      quotationNumber,
      clientId,
      projectName: projectName || `Direct Job Card - ${clientData.name}`,
      contactPerson,
      status: 'approved',
      items: [builtItem],
      subtotal,
      discount: disc,
      amountAfterDiscount,
      gstAmount, grandTotal,
      advancePercent: advancePayment?.percent || 0,
      advanceAmount: advAmount,
      approvedAt: new Date(),
      handledBy: req.user.userId,
      createdBy: req.user.userId,
      revisionNumber: 1,
    });

    // 3. Create Project
    const projectNumber = await generateProjectNumber(req.user.companyId, company.projectPrefix);
    const project = await Project.create({
      companyId: req.user.companyId,
      projectNumber,
      clientId,
      quotationId: quotation._id,
      projectName: quotation.projectName,
      // Intentionally omitting architect/designer fields
      contactPerson,
      priority: priority || 'medium',
      status: 'active',
      createdBy: req.user.userId,
    });

    quotation.projectId = project._id;
    await quotation.save();

    // 4. Create Job Card
    const jobCardNumber = await generateJobCardNumber(req.user.companyId, company.jobCardPrefix);
    
    const cleanAssignedTo = {
      production: (assignedTo?.production || []).map(s => (s?._id || s)?.toString()),
      qc:         (assignedTo?.qc || []).map(s => (s?._id || s)?.toString()),
      dispatch:   (assignedTo?.dispatch || []).map(s => (s?._id || s)?.toString()),
      accounts:   (assignedTo?.accounts || []).map(s => (s?._id || s)?.toString()),
    };

    const jobCard = await JobCard.create({
      companyId: req.user.companyId,
      jobCardNumber,
      projectId: project._id,
      clientId,
      quotationId: quotation._id,
      title: builtItem.category ? `${builtItem.category} - ${builtItem.description}` : (builtItem.description || `Item 1`),
      items: [builtItem],
      contactPerson,
      salesperson,
      expectedDelivery,
      assignedTo: cleanAssignedTo,
      priority: priority || 'medium',
      orderDate: new Date(),
      status: 'active',
      activityLog: [{
        action: 'created',
        doneBy: req.user.userId,
        newStatus: 'active',
        note: 'Direct Job Card created synchronously',
        timestamp: new Date(),
      }],
      createdBy: req.user.userId,
    });

    // 5. Create Invoice
    const invoiceNumber = await generateInvoiceNumber(req.user.companyId, company.invoicePrefix);
    const invoicePayments = [];
    if (advAmount > 0) {
      invoicePayments.push({
        amount: advAmount,
        mode: advancePayment.mode || 'cash',
        reference: advancePayment.reference || '',
        paidAt: new Date(),
        recordedBy: req.user.userId,
      });
    }
    const balanceDue = Math.max(0, grandTotal - advAmount);
    const invoiceStatus = balanceDue <= 0 ? 'paid' : (advAmount > 0 ? 'partially_paid' : 'draft');

    const invoice = await Invoice.create({
      companyId: req.user.companyId,
      invoiceNumber,
      clientId,
      projectId: project._id,
      quotationId: quotation._id,
      jobCardIds: [jobCard._id],

      items: [{
        srNo: 1,
        category: builtItem.category,
        description: builtItem.description,
        qty: builtItem.qty,
        unit: builtItem.unit,
        rate: builtItem.sellingPrice,
        amount: builtItem.totalPrice,
      }],
      subtotal,
      discount: disc,
      amountAfterDiscount,
      gstAmount, grandTotal,
      advancePaid: advAmount,
      balanceDue,
      payments: invoicePayments,
      status: invoiceStatus,
      createdBy: req.user.userId,
    });

    res.status(201).json({
      success: true,
      quotation,
      project,
      jobCard,
      invoice,
      message: 'Direct Job Card successfully generated.'
    });

    auditLog(req, {
      action: 'create',
      resourceType: 'JobCard',
      resourceId: jobCard._id,
      resourceLabel: jobCardNumber,
      metadata: { type: 'direct_jobcard', projectId: project._id, quotationId: quotation._id },
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

    if (status) {
      filter.status = Array.isArray(status) ? { $in: status } : status;
    }
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
      const role = req.user.role;
      const RELEVANT_ROLES = ['production', 'qc', 'accounts']; // Removed 'dispatch'
      if (role && RELEVANT_ROLES.includes(role)) {
        const userOid = new mongoose.Types.ObjectId(req.user.userId);
        filter[`assignedTo.${role}`] = { $in: [userOid] };
      }
    }


    const [jobCards, total] = await Promise.all([
      JobCard.find(filter)
        .populate('clientId', 'name firmName address')
        .populate('projectId', 'projectName projectNumber')
        .populate('assignedTo.production', 'name role profilePhoto')
        .populate('quotationId', 'grandTotal')
        .populate('dispatchStageId')
        .select('-activityLog') 
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
      .populate('assignedTo.production', 'name role')
      .populate('assignedTo.qc', 'name role')
      .populate('assignedTo.dispatch', 'name role')
      .populate('assignedTo.accounts', 'name role')
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

    try {
      const { notifyDepartment } = await import('../utils/notifications.js');
      let targetDept;
      if (status === 'in_production') targetDept = 'production';
      else if (status === 'in_qc') targetDept = 'qc';
      else if (status === 'ready_for_dispatch') targetDept = 'dispatch';
      
      if (targetDept) {
        await notifyDepartment(req.user.companyId, targetDept, {
          type: 'status_changed',
          title: `Work Status Update`,
          message: `Job Card ${jobCard.jobCardNumber} (${jobCard.title}) is now ${status.replace(/_/g, ' ').toUpperCase()}.`,
          jobCardId: jobCard._id,
          projectId: jobCard.projectId,
          quotationId: jobCard.quotationId
        });
      }
    } catch (e) {
      console.error('Notification error on status change', e);
    }

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

    // Stage 8 Guard: Comprehensive Financial Check
    // Check all invoices linked to this Job Card specifically, or the parent project
    const invoices = await Invoice.find({ 
      $or: [
        { jobCardIds: jobCard._id },
        { projectId: jobCard.projectId }
      ],
      companyId: req.user.companyId 
    });

    if (invoices.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot close: No invoice found for this job card. Please generate an invoice first.',
      });
    }

    const pendingInvoices = invoices.filter(inv => inv.balanceDue > 0);
    if (pendingInvoices.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot close: There are ${pendingInvoices.length} invoices with pending payments (Total Due: ₹${pendingInvoices.reduce((acc, inv) => acc + inv.balanceDue, 0)}).`,
      });
    }

    jobCard.status = 'closed';
    jobCard.warrantyNotes = warrantyNotes;
    jobCard.punchListItems = punchListItems || [];
    jobCard.closedBy = req.user.userId;
    jobCard.actualDelivery = jobCard.actualDelivery || new Date();
    await jobCard.save();

    // Auto-complete project if ALL associated job cards are now closed
    const projectJobCards = await JobCard.find({ 
      projectId: jobCard.projectId, 
      companyId: jobCard.companyId 
    });
    
    const allClosed = projectJobCards.every(jc => jc.status === 'closed');
    if (allClosed) {
      await Project.findByIdAndUpdate(jobCard.projectId, { 
        status: 'completed',
        actualDelivery: new Date()
      });
      // Optional: auditLog or notification for project completion could be added here
    }

    await addActivityLog(jobCard._id, {
      action: 'closed',
      doneBy: req.user.userId,
      prevStatus: 'delivered',
      newStatus: 'closed',
      note: 'Job card closed and archived',
    });

    // WhatsApp Hook (Dormant until ready)
    // await sendWhatsAppBulk(['91xxxxxxxxxx'], WA_TEMPLATES.JOB_CLOSED, [jobCard.jobCardNumber]);

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

    // Explicitly set CORS headers on binary response — Cloud Run can drop CORS
    // headers on large non-JSON responses without this explicit override.
    const origin = req.headers.origin;
    if (origin) res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${jobCard.jobCardNumber}.pdf"` });
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/jobcards/:id/assign — Assign/Reassign staff ─────────────────

export const assignJobCard = async (req, res, next) => {
  try {
    const { stage, userIds } = req.body; // stage: 'production' | 'qc' | etc.
    const VALID_STAGES = ['production', 'qc', 'dispatch', 'accounts'];

    if (!VALID_STAGES.includes(stage)) {
      return res.status(400).json({ success: false, message: 'Invalid stage for assignment' });
    }

    // Role-based validation for production stage
    if (stage === 'production' && userIds?.length > 0) {
      const staff = await User.find({ _id: { $in: userIds } }).select('role');
      const hasNonManagers = staff.some(u => {
        const r = u.role?.toLowerCase().replace(/[\s_]/g, '');
        return r !== 'factorymanager';
      });
      if (hasNonManagers) {
        return res.status(400).json({
          success: false,
          message: 'Assignment restricted: Only users with the Factory Manager role can be assigned to the production stage.'
        });
      }
    }

    const jobCard = await JobCard.findOne({ _id: req.params.id, ...req.companyFilter });
    if (!jobCard) return res.status(404).json({ success: false, message: 'Job card not found' });

    const prevAssigned = jobCard.assignedTo[stage] || [];
    jobCard.assignedTo[stage] = userIds;
    await jobCard.save();

    await addActivityLog(jobCard._id, {
      action: 'staff_assigned',
      doneBy: req.user.userId,
      newStatus: jobCard.status,
      note: `Assigned staff to ${stage} stage`,
    });

    if (userIds && userIds.length > 0) {
      try {
        const { notifyRecipients } = await import('../utils/notifications.js');
        await notifyRecipients({
          companyId: req.user.companyId,
          recipients: userIds,
          type: 'general',
          title: `Team Assignment: ${jobCard.jobCardNumber}`,
          message: `You have been assigned to ${stage} stage for Job Card: ${jobCard.title}.`,
          jobCardId: jobCard._id,
          projectId: jobCard.projectId,
          quotationId: jobCard.quotationId
        });
      } catch (e) {
        console.error('Notification error on assignment', e);
      }
    }

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
