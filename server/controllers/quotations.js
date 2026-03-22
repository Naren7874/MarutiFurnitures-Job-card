import Quotation from '../models/Quotation.js';
import Company from '../models/Company.js';
import Client from '../models/Client.js';
import Project from '../models/Project.js';
import JobCard from '../models/JobCard.js';
import DesignRequest from '../models/DesignRequest.js';
import { Invoice } from '../models/Invoice.js';
import { StoreStage } from '../models/StoreStage.js';
import { ProductionStage } from '../models/ProductionStage.js';
import { QcStage } from '../models/QcStage.js';
import { DispatchStage } from '../models/DispatchStage.js';
import { generateQuotationNumber, generateProjectNumber, generateJobCardNumber, generateInvoiceNumber } from '../utils/autoNumber.js';
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
    const PROTECTED = ['companyId', 'quotationNumber', 'createdBy', 'revisionOf', 'projectId'];
    PROTECTED.forEach((f) => delete req.body[f]);

    // 1. Find the quotation
    const quotation = await Quotation.findOne({
      _id: req.params.id,
      ...req.companyFilter,
      status: { $nin: ['converted', 'rejected', 'revised'] },
    });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found or cannot be edited in current status',
      });
    }

    // Snapshot previous for tracking changes
    const prevSnapshot = quotation.toObject();

    // 2. Update fields manually to trigger pre('save') correctly
    Object.assign(quotation, req.body);

    // Increment revision number if modified after being sent or approved
    if (quotation.status !== 'draft') {
      quotation.revisionNumber = (quotation.revisionNumber || 1) + 1;
    }

    // 3. Save to trigger pre('save') hooks (for totals)
    await quotation.save();

    // Compute changed fields for audit log
    const changes = {};
    const tracked = ['projectName', 'architect', 'architectContact', 'projectDesigner', 'projectDesignerContact', 'grandTotal', 'status', 'validUntil'];
    tracked.forEach(f => {
      if (String(prevSnapshot[f]) !== String(quotation[f])) {
        changes[f] = { from: prevSnapshot[f], to: quotation[f] };
      }
    });

    // 4. Sync with Project and Job Cards if this quotation is already approved/active
    if (quotation.projectId) {
      // Sync Project basic info
      await Project.findByIdAndUpdate(quotation.projectId, {
        projectName:            quotation.projectName,
        architect:              quotation.architect,
        architectContact:       quotation.architectContact,
        projectDesigner:        quotation.projectDesigner,
        projectDesignerContact: quotation.projectDesignerContact,
        siteAddress:            quotation.siteAddress,
      });

      // SYNC JOB CARDS (One Job Card per Item pattern)
      const existingJobCards = await JobCard.find({ 
        quotationId: quotation._id,
        companyId: req.user.companyId 
      });

      const processedJobCardIds = new Set();

      for (const quoItem of quotation.items) {
        // Find matching job card for this specific quotation item
        // Matching by item._id (best) or srNo
        const matchingJC = existingJobCards.find(jc => 
          jc.items.some(i => (i._id && String(i._id) === String(quoItem._id)) || (i.srNo === quoItem.srNo))
        );

        if (matchingJC) {
          // UPDATE EXISTING
          matchingJC.title = quoItem.category ? `${quoItem.category} - ${quoItem.description}` : (quoItem.description || matchingJC.title);
          matchingJC.salesperson = {
            id:   quotation.salesPerson?.id || quotation.salesPerson,
            name: (typeof quotation.salesPerson === 'object' && quotation.salesPerson?.name) ? quotation.salesPerson.name : (quotation.salesPerson?.name || '')
          };
          matchingJC.contactPerson = quotation.contactPerson || '';
          
          matchingJC.items = [{
            _id:            quoItem._id, // preserve ID link
            srNo:           quoItem.srNo,
            category:       quoItem.category,
            description:    quoItem.description,
            photo:          quoItem.photo,
            fabricPhoto:    quoItem.fabricPhoto,
            photos:         quoItem.photos || [],
            specifications: quoItem.specifications,
            qty:            quoItem.qty,
            unit:           quoItem.unit || 'pcs',
          }];
          // Also sync project level fields in case they changed
          matchingJC.priority = quoItem.specifications?.priority || matchingJC.priority;
          matchingJC.expectedDelivery = quotation.validUntil || matchingJC.expectedDelivery; // fallback or logic
          
          await matchingJC.save();
          processedJobCardIds.add(String(matchingJC._id));
        } else {
          // CREATE NEW (Since this item exists in Quotation but has no Job Card)
          const jcNumber = await generateJobCardNumber(req.user.companyId);
          
          const newJC = await JobCard.create({
            companyId:     req.user.companyId,
            jobCardNumber: jcNumber,
            projectId:     quotation.projectId,
            clientId:      quotation.clientId,
            quotationId:   quotation._id,
            title:         quoItem.category ? `${quoItem.category} - ${quoItem.description}` : (quoItem.description || `Item ${quoItem.srNo}`),
            items: [{
              _id:            quoItem._id,
              srNo:           quoItem.srNo,
              category:       quoItem.category,
              description:    quoItem.description,
              photo:          quoItem.photo,
              fabricPhoto:    quoItem.fabricPhoto,
              photos:         quoItem.photos || [],
              specifications: quoItem.specifications,
              qty:            quoItem.qty,
              unit:           quoItem.unit || 'pcs',
            }],
            expectedDelivery: quotation.validUntil, // default to validUntil if set
            status:      'active',
            priority:    quoItem.specifications?.priority || 'medium',
            createdBy:   req.user.userId,
            activityLog: [{
              action:    'created',
              doneBy:    req.user.userId,
              newStatus: 'active',
              note:      `Created via quotation update sync: ${quotation.quotationNumber}`,
              timestamp: new Date(),
            }],
          });

          // Also create DesignRequest for new Job Card
          const dr = await DesignRequest.create({
            companyId: req.user.companyId,
            jobCardId: newJC._id,
            projectId: quotation.projectId,
            clientId:  quotation.clientId,
            status:    'pending',
            createdBy: req.user.userId,
          });
          newJC.designRequestId = dr._id;
          await newJC.save();
        }
      }

      // HANDLE ORPHANED JOB CARDS (Job cards whose items were removed from Quotation)
      const orphanedJCs = existingJobCards.filter(jc => !processedJobCardIds.has(String(jc._id)));
      for (const ojc of orphanedJCs) {
        // If it's still "active", we can delete or cancel.
        // Let's mark as cancelled to be safe and keep history.
        if (ojc.status === 'active') {
          ojc.status = 'cancelled';
          ojc.cancelReason = 'Item removed from associated quotation';
          ojc.cancelledAt = new Date();
          ojc.activityLog.push({
            action: 'status_changed',
            doneBy: req.user.userId,
            prevStatus: 'active',
            newStatus: 'cancelled',
            note: 'Automatically cancelled because item was removed from quotation',
          });
          await ojc.save();
        }
      }
    }

    // 5. SYNC LINKED INVOICE (if quotation already has one)
    const linkedInvoice = await Invoice.findOne({
      quotationId: quotation._id,
      companyId: req.user.companyId,
    });

    if (linkedInvoice) {
      // Rebuild invoice items from updated quotation items
      linkedInvoice.items = quotation.items.map((item, idx) => ({
        srNo:        idx + 1,
        category:    item.category || '',
        description: item.description || '',
        qty:         item.qty || 1,
        unit:        item.unit || 'pcs',
        rate:        item.sellingPrice || 0,
        amount:      item.totalPrice || (item.qty * (item.sellingPrice || 0)) || 0,
      }));

      // Recalculate invoice totals
      const newSubtotal = linkedInvoice.items.reduce((sum, i) => sum + (i.qty * i.rate), 0);
      const newDiscount = quotation.discount || 0;
      linkedInvoice.subtotal = newSubtotal;
      linkedInvoice.discount = newDiscount;
      linkedInvoice.amountAfterDiscount = newSubtotal - newDiscount;
      const gstFactor = 0.09; // 9% each for CGST + SGST
      if (linkedInvoice.gstType === 'igst') {
        linkedInvoice.igst  = +(linkedInvoice.amountAfterDiscount * 0.18).toFixed(2);
        linkedInvoice.cgst  = 0;
        linkedInvoice.sgst  = 0;
      } else {
        linkedInvoice.igst  = 0;
        linkedInvoice.cgst  = +(linkedInvoice.amountAfterDiscount * gstFactor).toFixed(2);
        linkedInvoice.sgst  = +(linkedInvoice.amountAfterDiscount * gstFactor).toFixed(2);
      }
      linkedInvoice.gstAmount  = linkedInvoice.igst + linkedInvoice.cgst + linkedInvoice.sgst;
      linkedInvoice.grandTotal = +(linkedInvoice.amountAfterDiscount + linkedInvoice.gstAmount).toFixed(2);
      const totalPaidSoFar = linkedInvoice.payments.reduce((sum, p) => sum + p.amount, 0);
      linkedInvoice.advancePaid = totalPaidSoFar;
      linkedInvoice.balanceDue  = Math.max(0, linkedInvoice.grandTotal - totalPaidSoFar);
      
      if (linkedInvoice.balanceDue <= 0) {
        linkedInvoice.status = 'paid';
      } else if (linkedInvoice.advancePaid > 0) {
        linkedInvoice.status = 'partially_paid';
      } else if (linkedInvoice.status === 'paid' || linkedInvoice.status === 'partially_paid') {
        linkedInvoice.status = 'draft'; 
      }

      linkedInvoice.pdfURL = ''; // invalidate cached PDF
      await linkedInvoice.save();
    }

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
      architectContact: prev.architectContact,
      projectDesigner: prev.projectDesigner,
      projectDesignerContact: prev.projectDesignerContact,
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
        title:       item.category ? `${item.category} - ${item.description}` : (item.description || `Item ${item.srNo}`),
        items: [{
          srNo:           item.srNo,
          category:       item.category,
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
        priority:    item.specifications?.priority || 'medium',
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

    // 4. AUTO-CREATE INVOICE from quotation items
    const invoiceNumber = await generateInvoiceNumber(req.user.companyId, company.invoicePrefix);
    const clientData = prev.clientId;
    const invoiceItems = (prev.items || []).map((item, idx) => ({
      srNo:        idx + 1,
      category:    item.category || '',
      description: item.description || '',
      qty:         item.qty || 1,
      unit:        item.unit || 'pcs',
      rate:        item.sellingPrice || 0,
      amount:      item.totalPrice || (item.qty * (item.sellingPrice || 0)) || 0,
    }));

    const invoiceSubtotal = invoiceItems.reduce((s, i) => s + (i.qty * i.rate), 0);
    const invoiceDiscount = prev.discount || 0;
    const invoiceAfterDiscount = invoiceSubtotal - invoiceDiscount;
    // Default GST: use 18% CGST+SGST for domestic
    const invoiceCgst = +(invoiceAfterDiscount * 0.09).toFixed(2);
    const invoiceSgst = +(invoiceAfterDiscount * 0.09).toFixed(2);
    const invoiceGrandTotal = +(invoiceAfterDiscount + invoiceCgst + invoiceSgst).toFixed(2);

    // Build initial payments array if advance was provided
    const { advancePayment } = req.body;
    const invoicePayments = [];
    if (advancePayment?.amount > 0) {
      invoicePayments.push({
        amount:     advancePayment.amount,
        mode:       advancePayment.mode || 'cash',
        reference:  advancePayment.reference || '',
        paidAt:     new Date(),
        recordedBy: req.user.userId,
      });
    }
    const totalPaidAtCreation = invoicePayments.reduce((s, p) => s + p.amount, 0);
    const invoiceBalanceDue = Math.max(0, invoiceGrandTotal - totalPaidAtCreation);
    const invoiceStatus = invoiceBalanceDue <= 0 ? 'paid' : (totalPaidAtCreation > 0 ? 'partially_paid' : 'draft');

    const newInvoice = await Invoice.create({
      companyId:            req.user.companyId,
      invoiceNumber,
      clientId:             clientData._id || clientData,
      projectId:            project._id,
      quotationId:          prev._id,
      gstType:             'cgst_sgst',
      placeOfSupply:        company.address?.state || '',
      clientGstinSnapshot:  clientData?.gstin || '',
      companyGstinSnapshot: company.gstin || '',
      items:                invoiceItems,
      subtotal:             invoiceSubtotal,
      discount:             invoiceDiscount,
      amountAfterDiscount:  invoiceAfterDiscount,
      cgst:                 invoiceCgst,
      sgst:                 invoiceSgst,
      igst:                 0,
      gstAmount:            invoiceCgst + invoiceSgst,
      grandTotal:           invoiceGrandTotal,
      advancePaid:          totalPaidAtCreation,
      balanceDue:           invoiceBalanceDue,
      payments:             invoicePayments,
      status:               invoiceStatus,
      createdBy:            req.user.userId,
    });

    // 5. Update quotation: mark approved + link project and save advance
    const quotation = await Quotation.findByIdAndUpdate(
      prev._id,
      { 
        status: 'approved', 
        approvedAt: new Date(), 
        projectId: project._id,
        advanceAmount: advancePayment?.amount ? Number(advancePayment.amount) : prev.advanceAmount
      },
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
      invoice: newInvoice,
      message: `Quotation approved. Project ${projectNumber}, ${jobCards.length} job card(s), and Invoice ${invoiceNumber} created automatically.`,
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
    const quotation = await Quotation.findOneAndUpdate(
      { _id: req.params.id, ...req.companyFilter },
      { 
        $set: { status: 'draft', pdfURL: '' },
        $inc: { revisionNumber: 1 }
      },
      { new: true }
    );

    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

    auditLog(req, {
      action: 'update',
      resourceType: 'Quotation',
      resourceId: quotation._id,
      resourceLabel: quotation.quotationNumber,
      changes: { status: { from: 'previous', to: 'draft' } },
      metadata: { action: 'revision_reopened', revisionNumber: quotation.revisionNumber },
    });

    res.status(200).json({ success: true, data: quotation });
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
    
    // Explicitly set CORS headers on binary response — Cloud Run can drop CORS
    // headers on large non-JSON responses without this explicit override.
    const origin = req.headers.origin;
    if (origin) res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set({ 
      'Content-Type': 'application/pdf', 
      'Content-Disposition': `inline; filename="${safeFilename}.pdf"`,
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

/**
 * Update teams for all Job Cards associated with a quotation
 * req.body.jobCardConfigs: Array of { srNo, assignedTo, salesperson, contactPerson, expectedDelivery }
 */
export const updateQuotationJobCardTeams = async (req, res, next) => {
  try {
    const { jobCardConfigs } = req.body;

    if (!Array.isArray(jobCardConfigs)) {
      return res.status(400).json({ success: false, message: 'jobCardConfigs must be an array' });
    }

    const quotation = await Quotation.findOne({ _id: req.params.id, ...req.companyFilter });
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    const updatedJobCards = [];

    for (const config of jobCardConfigs) {
      const { srNo, assignedTo, salesperson, contactPerson, expectedDelivery } = config;

      // Find the Job Card that matches this quotation and item
      const jobCard = await JobCard.findOne({
        quotationId: quotation._id,
        'items.srNo': srNo,
        companyId: req.user.companyId
      });

      if (jobCard) {
        if (assignedTo) jobCard.assignedTo = assignedTo;
        if (salesperson) jobCard.salesperson = salesperson;
        if (contactPerson) jobCard.contactPerson = contactPerson;
        if (expectedDelivery) jobCard.expectedDelivery = expectedDelivery;

        await jobCard.save();
        updatedJobCards.push(jobCard._id);

        auditLog(req, {
          action: 'update',
          resourceType: 'JobCard',
          resourceId: jobCard._id,
          resourceLabel: jobCard.jobCardNumber,
          metadata: { action: 'teams_updated_via_quotation' },
        });
      }
    }

    res.json({ 
      success: true, 
      message: `Updated ${updatedJobCards.length} job cards`,
      updatedJobCards 
    });

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
  QUOTATION_DATE:    new Date(quotation.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
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
  VALID_UNTIL:       quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
});

// ── DELETE /api/quotations/:id ──────────────────────────────────────────────
// PERMANENTLY deletes quotation and ALL associated data (cascade)
export const deleteQuotation = async (req, res, next) => {
  try {
    const quotationId = req.params.id;
    const filter = { _id: quotationId, ...req.companyFilter };

    // 1. Find the quotation to get linked projectId
    const quotation = await Quotation.findOne(filter).lean();
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    const { projectId } = quotation;

    // 2. Identify all Job Cards linked to this quotation
    const jobCards = await JobCard.find({ quotationId, companyId: req.user.companyId }).select('_id').lean();
    const jobCardIds = jobCards.map(jc => jc._id);

    // 3. Delete all related records in stages/design requests
    // We use deleteMany for efficiency
    await Promise.all([
      DesignRequest.deleteMany({ jobCardId: { $in: jobCardIds } }),
      StoreStage.deleteMany({ jobCardId: { $in: jobCardIds } }),
      ProductionStage.deleteMany({ jobCardId: { $in: jobCardIds } }),
      QcStage.deleteMany({ jobCardId: { $in: jobCardIds } }),
      DispatchStage.deleteMany({ jobCardId: { $in: jobCardIds } })
    ]);

    // 4. Delete Job Cards
    await JobCard.deleteMany({ quotationId, companyId: req.user.companyId });

    // 5. Delete Invoices
    await Invoice.deleteMany({ quotationId, companyId: req.user.companyId });

    // 6. Delete Project
    if (projectId) {
      await Project.deleteOne({ _id: projectId, companyId: req.user.companyId });
    }

    // 7. Delete the Quotation itself
    await Quotation.deleteOne(filter);

    auditLog(req, {
      action: 'delete',
      resourceType: 'Quotation',
      resourceId: quotationId,
      resourceLabel: quotation.quotationNumber,
      metadata: { 
        projectId, 
        jobCardsDeletedCount: jobCardIds.length,
        projectName: quotation.projectName 
      },
    });

    res.status(200).json({ 
      success: true, 
      message: 'Quotation and all associated records deleted successfully' 
    });
  } catch (err) {
    next(err);
  }
};
