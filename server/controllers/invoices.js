import { Invoice } from '../models/Invoice.js';
import Quotation from '../models/Quotation.js';
import Company from '../models/Company.js';
import Client from '../models/Client.js';
import { generateInvoiceNumber } from '../utils/autoNumber.js';
import { generateAndUploadPDF } from '../utils/generatePDF.js';
import { sendEmail, invoiceEmailHTML } from '../utils/sendEmail.js';
import { determineGSTType } from '../utils/verifyGST.js';
import { auditLog } from '../utils/auditLogger.js';

// ── POST /api/invoices ───────────────────────────────────────────────────────

export const createInvoice = async (req, res, next) => {
  try {
    const { quotationId, projectId, jobCardIds, items } = req.body;

    const company = await Company.findById(req.user.companyId).lean();
    const invoiceNumber = await generateInvoiceNumber(req.user.companyId, company.invoicePrefix);

    const quotation = quotationId
      ? await Quotation.findById(quotationId).populate('clientId').lean()
      : null;
    const client = quotation?.clientId || await Client.findById(req.body.clientId).lean();

    const gstType = determineGSTType(company.gstin, client?.gstin);

    const invoice = await Invoice.create({
      ...req.body,
      companyId:    req.user.companyId,
      invoiceNumber,
      gstType,
      placeOfSupply:        req.body.placeOfSupply || client?.gstState || company.address?.state,
      clientGstinSnapshot:  client?.gstin || '',
      companyGstinSnapshot: company.gstin || '',
      status:   'draft',
      createdBy: req.user.userId,
    });

    auditLog(req, {
      action: 'create',
      resourceType: 'Invoice',
      resourceId: invoice._id,
      resourceLabel: invoiceNumber,
      metadata: { grandTotal: req.body.grandTotal, gstType, quotationId, projectId },
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/invoices ────────────────────────────────────────────────────────

export const getInvoices = async (req, res, next) => {
  try {
    const { status, clientId, page = 1, limit = 20 } = req.query;
    const filter = { ...req.companyFilter };
    if (status)   filter.status   = status;
    if (clientId) filter.clientId = clientId;

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('clientId', 'name firmName phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Invoice.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, data: invoices, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

// ── GET /api/invoices/:id ────────────────────────────────────────────────────

export const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, ...req.companyFilter })
      .populate('clientId')
      .populate('projectId', 'projectName')
      .lean();
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.status(200).json({ success: true, data: invoice });
  } catch (err) { next(err); }
};

// ── POST /api/invoices/:id/payment — Record a payment ───────────────────────

export const recordPayment = async (req, res, next) => {
  try {
    const { amount, mode, reference } = req.body;

    const invoice = await Invoice.findOne({ _id: req.params.id, ...req.companyFilter });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const prevBalanceDue = invoice.balanceDue;
    const prevStatus     = invoice.status;

    invoice.payments.push({ amount, mode, reference, paidAt: new Date(), recordedBy: req.user.userId });

    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    invoice.advancePaid = totalPaid;
    invoice.balanceDue  = Math.max(0, invoice.grandTotal - totalPaid);
    invoice.status      = invoice.balanceDue <= 0 ? 'paid' : 'partially_paid';

    await invoice.save();

    auditLog(req, {
      action: 'update',
      resourceType: 'Invoice',
      resourceId: invoice._id,
      resourceLabel: invoice.invoiceNumber,
      changes: {
        balanceDue: { from: prevBalanceDue, to: invoice.balanceDue },
        status:     { from: prevStatus,     to: invoice.status },
      },
      metadata: { paymentAmount: amount, paymentMode: mode, reference },
    });

    res.status(200).json({ success: true, data: invoice });
  } catch (err) { next(err); }
};

// ── PATCH /api/invoices/:id/send — Generate PDF + send to client ────────────

export const sendInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, ...req.companyFilter })
      .populate('clientId').lean();
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const company = await Company.findById(req.user.companyId).lean();

    const pdfUrl = await generateAndUploadPDF(
      'invoice',
      {
        INVOICE_NUMBER:   invoice.invoiceNumber,
        CLIENT_NAME:      invoice.clientId?.name,
        CLIENT_GSTIN:     invoice.clientGstinSnapshot,
        COMPANY_GSTIN:    invoice.companyGstinSnapshot,
        PLACE_OF_SUPPLY:  invoice.placeOfSupply,
        GST_TYPE:         invoice.gstType === 'cgst_sgst' ? 'CGST + SGST' : 'IGST',
        GRAND_TOTAL:      invoice.grandTotal?.toLocaleString('en-IN'),
        BALANCE_DUE:      invoice.balanceDue?.toLocaleString('en-IN'),
      },
      `${company.slug}/invoices`,
      invoice.invoiceNumber
    );

    await Invoice.findByIdAndUpdate(invoice._id, {
      pdfURL: pdfUrl, status: 'sent', sentAt: new Date(),
    });

    if (invoice.clientId?.email) {
      await sendEmail({
        to:      invoice.clientId.email,
        subject: `Invoice ${invoice.invoiceNumber} — ${company.name}`,
        html:    invoiceEmailHTML(invoice.clientId.name, invoice.invoiceNumber, pdfUrl),
      });
    }

    auditLog(req, {
      action: 'update',
      resourceType: 'Invoice',
      resourceId: invoice._id,
      resourceLabel: invoice.invoiceNumber,
      changes: { status: { from: invoice.status, to: 'sent' } },
      metadata: { sentViaEmail: !!invoice.clientId?.email, pdfUrl },
    });

    res.status(200).json({ success: true, pdfUrl });
  } catch (err) { next(err); }
};

// ── GET /api/invoices/:id/pdf ────────────────────────────────────────────────

export const getInvoicePDF = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, ...req.companyFilter })
      .populate('clientId')
      .populate('projectId', 'projectName')
      .lean();
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const company = await Company.findById(req.user.companyId).lean();
    const { renderPDF } = await import('../utils/generatePDF.js');
    const pdfBuffer = await renderPDF('invoice', {
      company,
      invoice,
      client: invoice.clientId || {},
    });

    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${invoice.invoiceNumber}.pdf"` });
    res.send(pdfBuffer);
  } catch (err) { next(err); }
};
