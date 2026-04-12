import mongoose from "mongoose";

/* ─────────────────────────────────────────
   INVOICE
   Created by: Accountant after delivery
───────────────────────────────────────── */
const invoiceSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },

    invoiceNumber: { type: String, unique: true },       // Auto: MF-INV-2026-001

    projectId:   { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    jobCardIds:  [{ type: mongoose.Schema.Types.ObjectId, ref: "JobCard" }],
    clientId:    { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "Quotation" },

    // GST-compliant fields — required on a valid Indian tax invoice
    placeOfSupply:        { type: String },               // state name / code e.g. "Gujarat (24)"
    reverseCharge:        { type: Boolean, default: false }, // RCM applicable?
    clientGstinSnapshot:  { type: String },               // client GSTIN locked at invoice time
    companyGstinSnapshot: { type: String },               // company GSTIN locked at invoice time

    // Invoice line items (copied from quotation, editable by accountant)
    items: [
      {
        srNo:        Number,
        category:    String,
        description: String,
        qty:         Number,
        unit:        String,
        rate:        Number,
        amount:      Number,
        hsnCode:     { type: String, default: "9403" },  // furniture HSN
      },
    ],

    subtotal:            { type: Number, default: 0 },
    discount:            { type: Number, default: 0 },
    amountAfterDiscount: { type: Number, default: 0 },

    // GST breakdown
    gstRate:   { type: Number, default: 18 },
    gstAmount: { type: Number, default: 0 },
    grandTotal:{ type: Number, default: 0 },

    // Payment tracking
    advancePaid: { type: Number, default: 0 },
    balanceDue:  { type: Number, default: 0 },
    dueDate:     Date,

    payments: [
      {
        amount:    { type: Number, required: true },
        mode: {
          type: String,
          enum: ["cash", "upi", "neft", "cheque", "card"],
        },
        reference:   String,                             // UPI ref / cheque no / NEFT ref
        paidAt:      { type: Date, default: Date.now },
        recordedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        receiptURL:  String,                             // Cloudinary URL
      },
    ],

    status: {
      type: String,
      enum: ["draft", "sent", "partially_paid", "paid", "overdue", "on_hold"],
      default: "draft",
    },

    previousStatus: { type: String },
    onHoldReason:   { type: String },
    onHoldAt:       { type: Date },

    pdfURL:  String,                                     // Cloudinary URL
    sentAt:  Date,
    paidAt:  Date,

    notes:     String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

invoiceSchema.index({ companyId: 1, status: 1 });
invoiceSchema.index({ companyId: 1, clientId: 1 });

export const Invoice = mongoose.model("Invoice", invoiceSchema);

