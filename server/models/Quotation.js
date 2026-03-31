import mongoose from "mongoose";

/* 
  QUOTATION is the entry point of the entire system.
  Sales/Admin sits with client → captures requirements 
  → adds items with photos, specs, pricing
  → sends PDF to client for approval
  → on approval → Project is created from this quotation
*/

const quotationItemSchema = new mongoose.Schema(
  {
    srNo:        { type: Number, required: true },
    category:    { type: String },                       // "Reception Area", "Director's Cabin 1"
    description: { type: String },                       // "2 Seater Sofa"
    photo:       { type: String },                       // Cloudinary URL — printed on PDF (primary)
    fabricPhoto: { type: String },                       // Client's requested secondary photo
    photos:      [{ type: String }],                     // Additional Cloudinary URLs (multiple images)

    specifications: {
      size:     String,                                  // "L-59\" x D-30\""
      polish:   String,                                  // "Natural Teak"
      fabric:   String,                                  // legacy single fabric (kept for backward compat)
      fabrics:  [{ type: String }],                      // NEW — multiple fabric names
      material: String,                                  // "BWR Ply 19mm"
      finish:   String,
      hardware: String,
      priority: {
        type: String,
        enum: ["low", "medium", "high", "urgent"],
        default: "medium",
      },
      notes:    String,                                  // "As per design"
    },

    qty:          { type: Number, required: true },
    unit:         { type: String, default: "pcs" },
    mrp:          { type: Number },                      // MRP per unit (optional display)
    sellingPrice: { type: Number },                      // actual selling price per unit
    totalPrice:   { type: Number },                      // qty × sellingPrice — computed on save
  },
  { _id: true }
);

const quotationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    quotationNumber: { type: String, unique: true },     // Auto: MF-311025-01

    // Client details
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    // Site / project info captured at quotation stage
    projectName: { type: String, required: true },       // "GMP Office"
    architect:   { type: String },                       // Firm Name
    architectName: { type: String },                     // Person's Name
    architectId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    architectContact: { type: String },                  // architect's phone/email
    projectDesigner: { type: String },
    projectDesignerContact: { type: String },            // designer's phone/email
    siteAddress: {
      location: String,
      line1:    String,
      line2:    String,
      pincode:  String,
    },
    contactPerson: { type: String },

    // Initial requirements + reference material
    requirements:    { type: String },                   // free-text notes
    referenceImages: [{ type: String }],                 // Cloudinary URLs

    // Delivery
    deliveryDays: { type: String },                      // "75 to 90 days"
    validUntil:   { type: Date },

    // Line items — exactly like your real Maruti quotation
    items: [quotationItemSchema],

    // Totals — auto-computed in pre-save
    subtotal:            { type: Number, default: 0 },
    discount:            { type: Number, default: 0 },
    discountNote:        { type: String },               // "700 RS per mtr fabric, including"
    amountAfterDiscount: { type: Number, default: 0 },

    // GST — auto-detected from client GSTIN state vs company state
    gstType: {
      type: String,
      enum: ["cgst_sgst", "igst"],
    },
    cgst:      { type: Number, default: 0 },
    sgst:      { type: Number, default: 0 },
    igst:      { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    grandTotal:{ type: Number, default: 0 },

    // Payment terms
    advancePercent: { type: Number, default: 50 },
    advanceAmount:  { type: Number, default: 0 },

    // Architect Commission
    architectCommissionPercent: { type: Number, default: 0, min: 0, max: 100 },
    architectCommissionAmount:  { type: Number, default: 0 }, // auto-computed on save
    architectCommissionPaid:    { type: Boolean, default: false },

    // Terms & Conditions — array of lines like your real quotation
    termsAndConditions: [{ type: String }],
    additionalTerms: [{ type: String }],

    // Quotation lifecycle
    status: {
      type: String,
      enum: [
        "draft",       // being built
        "sent",        // PDF sent to client
        "approved",    // client approved → project will be created
        "rejected",    // client rejected
        "revised",     // new version created from this one
        "converted",   // project has been created from this quotation
      ],
      default: "draft",
    },

    // Revision tracking
    revisionOf:     { type: mongoose.Schema.Types.ObjectId, ref: "Quotation" },
    revisionNumber: { type: Number, default: 1 },

    // Timestamps for each status change
    sentAt:         { type: Date },
    approvedAt:     { type: Date },
    approvedBy:     { type: String },                    // client name / confirmation note
    rejectedAt:     { type: Date },
    rejectedReason: { type: String },
    convertedAt:    { type: Date },                      // when project was created

    // Project created from this quotation
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },

    // Staff assigned to this quotation — carries over to job cards on approval
    assignedStaff: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Who handled this
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // PDF
    pdfURL: { type: String },                            // Cloudinary URL

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Auto-compute all totals before save
quotationSchema.pre("save", function () {
  // 1. Item totals
  this.items.forEach((item) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.sellingPrice) || 0;
    item.totalPrice = +(qty * price).toFixed(2);
  });

  // 2. Subtotal
  this.subtotal = +this.items
    .reduce((sum, i) => sum + (Number(i.totalPrice) || 0), 0)
    .toFixed(2);

  // 3. After discount
  const discValue = Number(this.discount) || 0;
  this.amountAfterDiscount = +(this.subtotal - discValue).toFixed(2);

  // 4. GST — specifically reset as per Maruti requirements (GST handled at Invoice/SO stage usually or no longer on Quo)
  this.cgst = 0;
  this.sgst = 0;
  this.igst = 0;
  this.gstAmount = 0;

  // 5. Grand total + advance
  this.grandTotal = +(this.amountAfterDiscount).toFixed(2);
  
  const advPercent = Number(this.advancePercent) || 0;
  this.advanceAmount = +(this.grandTotal * (advPercent / 100)).toFixed(2);

  // 6. Architect commission
  const commPercent = Number(this.architectCommissionPercent) || 0;
  this.architectCommissionAmount = +(this.subtotal * (commPercent / 100)).toFixed(2);
});

quotationSchema.index({ companyId: 1, status: 1 });
quotationSchema.index({ companyId: 1, clientId: 1 });

export default mongoose.model("Quotation", quotationSchema);