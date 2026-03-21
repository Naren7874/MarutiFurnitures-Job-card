import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    slug:     { type: String, required: true, unique: true, lowercase: true },
    logo:     { type: String },                          // Cloudinary URL
    tagline:  { type: String },

    gstin:    { type: String, uppercase: true },
    address: {
      line1:   String,
      line2:   String,
      city:    String,
      state:   String,
      pincode: String,
    },
    phone:   { type: String },
    email:   { type: String, lowercase: true },
    website: { type: String },

    whatsappNumber: { type: String },                    // Official WA Business number
    socialLinks: {
      instagram: { type: String, trim: true },
      facebook:  { type: String, trim: true },
      youtube:   { type: String, trim: true },
      whatsapp:  { type: String, trim: true },
    },

    bankDetails: {
      accountName:   String,
      accountNumber: String,
      ifsc:          String,
      bankName:      String,
      branch:        String,
    },

    // PDF branding — prefix for all auto-numbers
    quotationPrefix: { type: String, default: "QT" },   // QT-311025-01
    jobCardPrefix:   { type: String, default: "JC" },   // JC-26-011
    invoicePrefix:   { type: String, default: "INV" },  // INV-170326-100
    projectPrefix:   { type: String, default: "PRJ" },  // PRJ-170326-100
    poPrefix:        { type: String, default: "PO" },   // PO-170326-100

    gstRates: {
      cgst: { type: Number, default: 9 },
      sgst: { type: Number, default: 9 },
      igst: { type: Number, default: 18 },
    },

    defaultTermsAndConditions: [{ type: String }],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Company", companySchema);