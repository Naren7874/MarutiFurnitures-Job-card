import Quotation from '../models/Quotation.js';
import Company from '../models/Company.js';
import Client from '../models/Client.js';
import Project from '../models/Project.js';
import JobCard from '../models/JobCard.js';
import DesignRequest from '../models/DesignRequest.js';
import { generateQuotationNumber, generateProjectNumber, generateJobCardNumber } from '../utils/autoNumber.js';
import { generateAndUploadPDF } from '../utils/generatePDF.js';
import { sendEmail, quotationEmailHTML } from '../utils/sendEmail.js';
import { sendWhatsApp, WA_TEMPLATES } from '../utils/sendWhatsApp.js';
import { auditLog } from '../utils/auditLogger.js';

// ── POST /api/quotations ─────────────────────────────────────────────────────

export const createQuotation = async (req, res, next) => {
  try {
    const [company, client] = await Promise.all([
      Company.findById(req.user.companyId).lean(),
      Client.findById(req.body.clientId).lean()
    ]);
    const quotationNumber = await generateQuotationNumber(req.user.companyId, company.quotationPrefix, client?.name);

    const quotation = await Quotation.create({
      ...req.body,
      companyId:       req.user.companyId,
      quotationNumber,
      status:          'draft',
      revisionNumber:  1,
      handledBy:       req.user.userId,
      createdBy:       req.user.userId,
      termsAndConditions: req.body.termsAndConditions?.length
        ? req.body.termsAndConditions
        : company.defaultTermsAndConditions,
    });

    auditLog(req, {
      action: 'create',
      resourceType: 'Quotation',
      resourceId: quotation._id,
      resourceLabel: quotationNumber,
      metadata: { clientId: req.body.clientId, grandTotal: req.body.grandTotal },
    });

    res.status(201).json({ success: true, data: quotation });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/quotations ──────────────────────────────────────────────────────

export const getQuotations = async (req, res, next) => {
  try {
    const { status, clientId, search, page = 1, limit = 20 } = req.query;
    const filter = { ...req.companyFilter };

    if (status)   filter.status   = status;
    if (clientId) filter.clientId = clientId;
    if (search) {
      filter.$or = [
        { quotationNumber: new RegExp(search, 'i') },
        { projectName:     new RegExp(search, 'i') },
      ];
    }

    const [quotations, total] = await Promise.all([
      Quotation.find(filter)
        .populate('clientId', 'name firmName phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Quotation.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: quotations,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/quotations/:id ──────────────────────────────────────────────────

export const getQuotationById = async (req, res, next) => {
  try {
    const quotation = await Quotation.findOne({ _id: req.params.id, ...req.companyFilter })
      .populate('clientId')
      .populate('assignedStaff', 'name role department profilePhoto')
      .lean();
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    res.status(200).json({ success: true, data: quotation });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/quotations/:id ──────────────────────────────────────────────────
// Allows editing draft, sent, AND approved quotations (admin can add items post-approval)

export const updateQuotation = async (req, res, next) => {
  try {
    const PROTECTED = ['companyId', 'quotationNumber', 'createdBy', 'revisionOf'];
    PROTECTED.forEach((f) => delete req.body[f]);

    // Snapshot previous for tracking changes
    const prevSnapshot = await Quotation.findOne({
      _id: req.params.id,
      ...req.companyFilter
    }).lean();

    const quotation = await Quotation.findOneAndUpdate(
      {
        _id: req.params.id,
        ...req.companyFilter,
        status: { $nin: ['converted', 'rejected', 'revised'] },
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found or cannot be edited in current status',
      });
    }

    // Compute changed fields
    const changes = {};
    const tracked = ['projectName', 'architect', 'projectDesigner', 'grandTotal', 'status', 'validUntil'];
    tracked.forEach(f => {
      if (prevSnapshot && String(prevSnapshot[f]) !== String(quotation[f])) {
        changes[f] = { from: prevSnapshot[f], to: quotation[f] };
      }
    });

    auditLog(req, {
      action: 'update',
      resourceType: 'Quotation',
      resourceId: quotation._id,
      resourceLabel: quotation.quotationNumber,
      changes: Object.keys(changes).length ? changes : undefined,
      metadata: { grandTotal: quotation.grandTotal },
    });

    res.status(200).json({ success: true, data: quotation });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/quotations/:id/send ──────────────────────────────────────────

export const sendQuotationPDF = async (req, res, next) => {
  try {
    const quotation = await Quotation.findOne({ _id: req.params.id, ...req.companyFilter })
      .populate('clientId')
      .lean();

    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

    const company = await Company.findById(req.user.companyId).lean();

    const pdfUrl = await generateAndUploadPDF(
      'quotation',
      { 
        company,
        quotation,
        client: quotation.clientId || {},
      },
      `${company.slug}/quotations`,
      quotation.quotationNumber
    );

    await Quotation.findByIdAndUpdate(quotation._id, { pdfURL: pdfUrl, status: 'sent' });

    const client = quotation.clientId;

    if (client?.email) {
      await sendEmail({
        to:      client.email,
        subject: `Quotation ${quotation.quotationNumber} — ${company.name}`,
        html:    quotationEmailHTML(client.name, quotation.quotationNumber, pdfUrl),
      });
    }

    if (client?.whatsappNumber) {
      await sendWhatsApp(client.whatsappNumber, WA_TEMPLATES.JOB_CARD_CREATED, [
        quotation.quotationNumber,
        client.name,
        pdfUrl,
      ]);
    }

    auditLog(req, {
      action: 'update',
      resourceType: 'Quotation',
      resourceId: quotation._id,
      resourceLabel: quotation.quotationNumber,
      changes: { status: { from: quotation.status, to: 'sent' } },
      metadata: { sentViaEmail: !!client?.email, sentViaWhatsApp: !!client?.whatsappNumber },
    });

    res.status(200).json({ success: true, pdfUrl, message: 'Quotation sent successfully' });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/quotations/:id/approve ───────────────────────────────────────
// Approves quotation AND auto-creates Project + one Job Card per item

export const approveQuotation = async (req, res, next) => {
  try {
    const prev = await Quotation.findOne({ _id: req.params.id, ...req.companyFilter })
      .populate('clientId', 'gstin name')
      .lean();

    if (!prev) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    if (!['sent', 'draft'].includes(prev.status)) {
      return res.status(400).json({ success: false, message: 'Quotation already approved or processed' });
    }

    const company = await Company.findById(req.user.companyId).lean();
    const { jobCardConfigs = [] } = req.body;

    // 1. Auto-create Project
    const projectNumber = await generateProjectNumber(req.user.companyId, company.projectPrefix);
    
    // Use first config for project-level defaults if available
    const firstConfig = jobCardConfigs[0] || {};

    const project = await Project.create({
      companyId:    req.user.companyId,
      projectNumber,
      clientId:     prev.clientId._id || prev.clientId,
      quotationId:  prev._id,
      projectName:  prev.projectName,
      architect:    prev.architect,
      projectDesigner: prev.projectDesigner,
      siteAddress:  prev.siteAddress,
      clientGstin:  prev.clientId?.gstin,
      contactPerson: firstConfig.contactPerson || prev.contactPerson,
      salesPerson:   firstConfig.salesPerson,
      priority:     'medium',
      assignedStaff: prev.assignedStaff || [],
      status:       'active',
      createdBy:    req.user.userId,
    });

    // 2. Auto-create one Job Card per quotation item
    const jobCards = [];
    for (const item of prev.items || []) {
      const jobCardNumber = await generateJobCardNumber(req.user.companyId, company.jobCardPrefix);

      // Find specific config for this item
      const config = jobCardConfigs.find(c => 
        (c.itemId && String(c.itemId) === String(item._id)) || 
        (c.srNo === item.srNo)
      ) || {};

      // Use assignedTo from config if provided, otherwise fallback to quotation defaults
      const assignedTo = config.assignedTo || {
        design:     prev.assignedStaff || [],
        store:      [],
        production: prev.assignedStaff || [],
        qc:         [],
        dispatch:   [],
        accountant: [],
      };

      const jobCard = await JobCard.create({
        companyId:   req.user.companyId,
        jobCardNumber,
        projectId:   project._id,
        clientId:    prev.clientId._id || prev.clientId,
        quotationId: prev._id,
        title:       item.description || `Item ${item.srNo}`,
        items: [{
          srNo:           item.srNo,
          description:    item.description,
          photo:          item.photo,
          fabricPhoto:    item.fabricPhoto,
          photos:         item.photos || [],             // all extra photos from quotation item
          specifications: item.specifications,
          qty:            item.qty,
          unit:           item.unit || 'pcs',
        }],
        salesperson: config.salesPerson,
        // contactPerson is stored as String in JobCard model — extract name from object if needed
        contactPerson: (typeof config.contactPerson === 'object' && config.contactPerson?.name)
          ? config.contactPerson.name
          : (config.contactPerson || prev.contactPerson || ''),
        expectedDelivery: config.expectedDelivery,
        assignedTo,
        priority:    'medium',
        orderDate:   new Date(),
        status:      'active',
        activityLog: [{
          action:    'created',
          doneBy:    req.user.userId,
          newStatus: 'active',
          note:      `Auto-created on quotation approval: ${prev.quotationNumber}`,
          timestamp: new Date(),
        }],
        createdBy: req.user.userId,
      });

      // Auto-create DesignRequest for each job card
      const designRequest = await DesignRequest.create({
        companyId:  req.user.companyId,
        jobCardId:  jobCard._id,
        projectId:  project._id,
        clientId:   prev.clientId._id || prev.clientId,
        status:     'pending',
        createdBy:  req.user.userId,
      });

      jobCard.designRequestId = designRequest._id;
      await jobCard.save();

      jobCards.push(jobCard);
    }

    // 3. Update quotation: mark approved + link project
    const quotation = await Quotation.findByIdAndUpdate(
      prev._id,
      { status: 'approved', approvedAt: new Date(), projectId: project._id },
      { new: true }
    );

    auditLog(req, {
      action: 'update',
      resourceType: 'Quotation',
      resourceId: quotation._id,
      resourceLabel: quotation.quotationNumber,
      changes: { status: { from: prev.status, to: 'approved' } },
      metadata: { projectId: project._id, jobCardsCreated: jobCards.length },
    });

    res.status(200).json({
      success: true,
      data: quotation,
      project,
      jobCards,
      message: `Quotation approved. Project ${projectNumber} and ${jobCards.length} job card(s) created automatically.`,
    });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/quotations/:id/reject ────────────────────────────────────────

export const rejectQuotation = async (req, res, next) => {
  try {
    const prev = await Quotation.findOne({ _id: req.params.id, ...req.companyFilter }).lean();
    const quotation = await Quotation.findOneAndUpdate(
      { _id: req.params.id, ...req.companyFilter, status: { $ne: 'converted' } },
      { status: 'rejected' },
      { new: true }
    );
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

    auditLog(req, {
      action: 'update',
      resourceType: 'Quotation',
      resourceId: quotation._id,
      resourceLabel: quotation.quotationNumber,
      changes: { status: { from: prev?.status, to: 'rejected' } },
      metadata: { reason: req.body.reason },
    });

    res.status(200).json({ success: true, data: quotation });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/quotations/:id/revise ─────────────────────────────────────────

export const reviseQuotation = async (req, res, next) => {
  try {
    const original = await Quotation.findOne({ _id: req.params.id, ...req.companyFilter }).lean();
    if (!original) return res.status(404).json({ success: false, message: 'Quotation not found' });

    const [company, client] = await Promise.all([
      Company.findById(req.user.companyId).lean(),
      Client.findById(original.clientId).lean()
    ]);
    const quotationNumber = await generateQuotationNumber(req.user.companyId, company.quotationPrefix, client?.name);

    const revisionData = {
      ...original,
      _id:            undefined,
      quotationNumber,
      status:         'draft',
      revisionOf:     original._id,
      revisionNumber: (original.revisionNumber || 1) + 1,
      pdfURL:         undefined,
      projectId:      undefined,
      createdAt:      undefined,
      updatedAt:      undefined,
      ...req.body,
      companyId:   req.user.companyId,
      createdBy:   req.user.userId,
      handledBy:   req.user.userId,
    };

    await Quotation.findByIdAndUpdate(original._id, { status: 'revised' });

    const revision = await Quotation.create(revisionData);

    auditLog(req, {
      action: 'create',
      resourceType: 'Quotation',
      resourceId: revision._id,
      resourceLabel: quotationNumber,
      metadata: {
        revisionOf: original._id,
        revisionNumber: revisionData.revisionNumber,
        originalNumber: original.quotationNumber,
      },
    });

    res.status(201).json({ success: true, data: revision });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/quotations/:id/pdf ──────────────────────────────────────────────

export const getQuotationPDF = async (req, res, next) => {
  try {
    const quotation = await Quotation.findOne({ _id: req.params.id, ...req.companyFilter })
      .populate('clientId')
      .lean();
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

    const company = await Company.findById(req.user.companyId).lean();
    const { renderPDF } = await import('../utils/generatePDF.js');
    const pdfBuffer = await renderPDF('quotation', {
      company,
      quotation,
      client: quotation.clientId || {},
    });

    const safeFilename = quotation.quotationNumber.replace(/[^\x00-\x7F]/g, '-').replace(/\s+/g, '_');
    res.set({ 
      'Content-Type': 'application/pdf', 
      'Content-Disposition': `inline; filename="${safeFilename}.pdf"` 
    });
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/quotations/:id/assign-staff ──────────────────────────────────
// Admin assigns staff to a quotation → syncs to linked job cards too

export const assignStaffToQuotation = async (req, res, next) => {
  try {
    const { staffIds } = req.body;

    if (!Array.isArray(staffIds)) {
      return res.status(400).json({ success: false, message: 'staffIds must be an array' });
    }

    const quotation = await Quotation.findOneAndUpdate(
      { _id: req.params.id, ...req.companyFilter },
      { assignedStaff: staffIds },
      { new: true }
    ).populate('assignedStaff', 'name role department profilePhoto');

    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    // Sync assigned staff to all linked job cards (design + production stages)
    if (quotation.projectId) {
      await JobCard.updateMany(
        { projectId: quotation.projectId, companyId: req.user.companyId },
        {
          $set: {
            'assignedTo.design':     staffIds,
            'assignedTo.production': staffIds,
          },
        }
      );
    }

    auditLog(req, {
      action: 'update',
      resourceType: 'Quotation',
      resourceId: quotation._id,
      resourceLabel: quotation.quotationNumber,
      metadata: { action: 'staff_assigned', staffCount: staffIds.length },
    });

    res.status(200).json({ success: true, data: quotation });
  } catch (err) {
    next(err);
  }
};

// ── Template data flattener ──────────────────────────────────────────────────

const flattenForTemplate = (quotation, company) => ({
  COMPANY_NAME:      company.name,
  COMPANY_ADDRESS:   `${company.address?.line1 || ''}, ${company.address?.city || ''}, ${company.address?.state || ''}`,
  COMPANY_PHONE:     company.phone,
  COMPANY_EMAIL:     company.email,
  COMPANY_GSTIN:     company.gstin,
  QUOTATION_NUMBER:  quotation.quotationNumber,
  QUOTATION_DATE:    new Date(quotation.createdAt).toLocaleDateString('en-IN'),
  CLIENT_NAME:       quotation.clientId?.name || '',
  CLIENT_FIRM:       quotation.clientId?.firmName || '',
  CLIENT_PHONE:      quotation.clientId?.phone || '',
  PROJECT_NAME:      quotation.projectName,
  PROJECT_DESIGNER:  quotation.projectDesigner || '',
  SITE_ADDRESS:      `${quotation.siteAddress?.location || ''}`,
  SUBTOTAL:          quotation.subtotal?.toLocaleString('en-IN') || '0',
  DISCOUNT:          quotation.discount?.toLocaleString('en-IN') || '0',
  GST_AMOUNT:        quotation.gstAmount?.toLocaleString('en-IN') || '0',
  GRAND_TOTAL:       quotation.grandTotal?.toLocaleString('en-IN') || '0',
  ADVANCE_AMOUNT:    quotation.advanceAmount?.toLocaleString('en-IN') || '0',
  DELIVERY_DAYS:     quotation.deliveryDays || '',
  VALID_UNTIL:       quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('en-IN') : '',
});
