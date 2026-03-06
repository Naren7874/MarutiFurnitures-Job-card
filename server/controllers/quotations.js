import Quotation from '../models/Quotation.js';
import Company from '../models/Company.js';
import Client from '../models/Client.js';
import { generateQuotationNumber } from '../utils/autoNumber.js';
import { generateAndUploadPDF } from '../utils/generatePDF.js';
import { sendEmail, quotationEmailHTML } from '../utils/sendEmail.js';
import { sendWhatsApp, WA_TEMPLATES } from '../utils/sendWhatsApp.js';
import { auditLog } from '../utils/auditLogger.js';

// ── POST /api/quotations ─────────────────────────────────────────────────────

export const createQuotation = async (req, res, next) => {
  try {
    const company = await Company.findById(req.user.companyId).lean();
    const quotationNumber = await generateQuotationNumber(req.user.companyId, company.quotationPrefix);

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
      .lean();
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    res.status(200).json({ success: true, data: quotation });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/quotations/:id ──────────────────────────────────────────────────

export const updateQuotation = async (req, res, next) => {
  try {
    const PROTECTED = ['companyId', 'quotationNumber', 'createdBy', 'revisionOf', 'status'];
    PROTECTED.forEach((f) => delete req.body[f]);

    const quotation = await Quotation.findOneAndUpdate(
      { _id: req.params.id, ...req.companyFilter, status: { $in: ['draft', 'sent'] } },
      req.body,
      { new: true, runValidators: true }
    );

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found or cannot be edited in current status',
      });
    }

    auditLog(req, {
      action: 'update',
      resourceType: 'Quotation',
      resourceId: quotation._id,
      resourceLabel: quotation.quotationNumber,
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
      { ...flattenForTemplate(quotation, company) },
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

export const approveQuotation = async (req, res, next) => {
  try {
    const prev = await Quotation.findOne({ _id: req.params.id, ...req.companyFilter }).lean();
    const quotation = await Quotation.findOneAndUpdate(
      { _id: req.params.id, ...req.companyFilter, status: { $in: ['sent', 'draft'] } },
      { status: 'approved' },
      { new: true }
    );
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found or already processed' });
    }

    auditLog(req, {
      action: 'update',
      resourceType: 'Quotation',
      resourceId: quotation._id,
      resourceLabel: quotation.quotationNumber,
      changes: { status: { from: prev?.status, to: 'approved' } },
    });

    res.status(200).json({ success: true, data: quotation });
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

    const company = await Company.findById(req.user.companyId).lean();
    const quotationNumber = await generateQuotationNumber(req.user.companyId, company.quotationPrefix);

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
    const pdfBuffer = await renderPDF('quotation', flattenForTemplate(quotation, company));

    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${quotation.quotationNumber}.pdf"` });
    res.send(pdfBuffer);
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
  SITE_ADDRESS:      `${quotation.siteAddress?.line1 || ''}, ${quotation.siteAddress?.city || ''}`,
  SUBTOTAL:          quotation.subtotal?.toLocaleString('en-IN') || '0',
  DISCOUNT:          quotation.discount?.toLocaleString('en-IN') || '0',
  GST_AMOUNT:        quotation.gstAmount?.toLocaleString('en-IN') || '0',
  GRAND_TOTAL:       quotation.grandTotal?.toLocaleString('en-IN') || '0',
  ADVANCE_AMOUNT:    quotation.advanceAmount?.toLocaleString('en-IN') || '0',
  DELIVERY_DAYS:     quotation.deliveryDays || '',
  VALID_UNTIL:       quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('en-IN') : '',
});
