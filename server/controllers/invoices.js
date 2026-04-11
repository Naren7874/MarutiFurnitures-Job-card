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



    const invoice = await Invoice.create({
      ...req.body,
      companyId:    req.user.companyId,
      invoiceNumber,
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
      metadata: { grandTotal: req.body.grandTotal, quotationId, projectId },
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/invoices ────────────────────────────────────────────────────────

export const getInvoices = async (req, res, next) => {
  try {
    const { status, clientId, jobCardId, projectId, page = 1, limit = 20 } = req.query;
    const filter = { ...req.companyFilter };
    if (status)    filter.status    = status;
    if (clientId)  filter.clientId  = clientId;
    if (jobCardId) filter.jobCardIds = jobCardId;
    if (projectId) filter.projectId   = projectId;

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('clientId', 'name firmName phone')
        .populate('projectId', 'projectName')
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

// ── PATCH /api/invoices/:id/payment/:paymentId ──────────────────────────────

export const updatePayment = async (req, res, next) => {
  try {
    const { id, paymentId } = req.params;
    const { amount, mode, reference, paidAt } = req.body;

    const invoice = await Invoice.findOne({ _id: id, ...req.companyFilter });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const payment = invoice.payments.id(paymentId);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    const prevBalanceDue = invoice.balanceDue;
    const prevStatus     = invoice.status;

    if (amount !== undefined) payment.amount = amount;
    if (mode) payment.mode = mode;
    if (reference !== undefined) payment.reference = reference;
    if (paidAt) payment.paidAt = paidAt;

    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    invoice.advancePaid = totalPaid;
    invoice.balanceDue  = Math.max(0, invoice.grandTotal - totalPaid);
    invoice.status      = invoice.balanceDue <= 0 ? 'paid' : (totalPaid > 0 ? 'partially_paid' : (invoice.sentAt ? 'sent' : 'draft'));

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
      metadata: { paymentId, update: req.body },
    });

    res.status(200).json({ success: true, data: invoice });
  } catch (err) { next(err); }
};

// ── DELETE /api/invoices/:id/payment/:paymentId ──────────────────────────────

export const deletePayment = async (req, res, next) => {
  try {
    const { id, paymentId } = req.params;

    const invoice = await Invoice.findOne({ _id: id, ...req.companyFilter });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const prevBalanceDue = invoice.balanceDue;
    const prevStatus     = invoice.status;

    invoice.payments.pull(paymentId);

    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    invoice.advancePaid = totalPaid;
    invoice.balanceDue  = Math.max(0, invoice.grandTotal - totalPaid);
    invoice.status      = invoice.balanceDue <= 0 ? (totalPaid > 0 ? 'paid' : (invoice.sentAt ? 'sent' : 'draft')) : (totalPaid > 0 ? 'partially_paid' : (invoice.sentAt ? 'sent' : 'draft'));

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
      metadata: { deletedPaymentId: paymentId },
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
        company,
        invoice,
        client: invoice.clientId || {},
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

    // WhatsApp Hook (Dormant until ready)
    // if (invoice.clientId?.whatsappNumber) {
    //   await sendWhatsApp(invoice.clientId.whatsappNumber, WA_TEMPLATES.INVOICE_SENT, [invoice.invoiceNumber, pdfUrl]);
    // }

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

// ── PATCH /api/invoices/:id ──────────────────────────────────────────────────
export const updateInvoice = async (req, res, next) => {
  try {
    const { items, discount, advancePaid, dueDate } = req.body;
    
    const invoice = await Invoice.findOne({ _id: req.params.id, ...req.companyFilter });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const prevGrandTotal = invoice.grandTotal;
    const prevItems = JSON.stringify(invoice.items);

    // Update basic fields
    if (items) invoice.items = items;
    if (discount !== undefined) invoice.discount = discount;
    if (advancePaid !== undefined) {
      invoice.advancePaid = advancePaid;
    }
    if (dueDate) invoice.dueDate = dueDate;
    if (req.body.placeOfSupply) invoice.placeOfSupply = req.body.placeOfSupply;

    if (req.body.gstRate !== undefined) invoice.gstRate = req.body.gstRate;
    if (req.body.notes !== undefined)   invoice.notes = req.body.notes;

    // Recalculate Totals
    const subtotal = invoice.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    invoice.subtotal = subtotal;
    invoice.amountAfterDiscount = subtotal - (invoice.discount || 0);

    const gstRate = req.body.gstRate !== undefined ? req.body.gstRate : 18;
    const gstFactor = gstRate / 100;

    invoice.gstAmount = invoice.amountAfterDiscount * gstFactor;
    invoice.grandTotal = invoice.amountAfterDiscount + invoice.gstAmount;

    // Balance calculation
    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    invoice.advancePaid = Math.max(invoice.advancePaid, totalPaid);
    invoice.balanceDue = Math.max(0, invoice.grandTotal - invoice.advancePaid);

    // Update status
    if (invoice.status === 'draft' || invoice.status === 'sent') {
       invoice.status = invoice.balanceDue <= 0 ? 'paid' : (invoice.advancePaid > 0 ? 'partially_paid' : invoice.status);
    }

    if (prevGrandTotal !== invoice.grandTotal || prevItems !== JSON.stringify(invoice.items)) {
      invoice.pdfURL = '';
    }

    await invoice.save();

    auditLog(req, {
      action: 'update',
      resourceType: 'Invoice',
      resourceId: invoice._id,
      resourceLabel: invoice.invoiceNumber,
      metadata: { itemsCount: invoice.items.length, grandTotal: invoice.grandTotal },
    });

    res.status(200).json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
};


// ── DELETE /api/invoices/:id ────────────────────────────────────────────────
export const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, ...req.companyFilter });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    await Invoice.deleteOne({ _id: invoice._id });

    auditLog(req, {
      action: 'delete',
      resourceType: 'Invoice',
      resourceId: invoice._id,
      resourceLabel: invoice.invoiceNumber,
      metadata: { grandTotal: invoice.grandTotal, clientId: invoice.clientId },
    });

    res.status(200).json({ success: true, message: 'Invoice deleted successfully' });
  } catch (err) {
    next(err);
  }
};
