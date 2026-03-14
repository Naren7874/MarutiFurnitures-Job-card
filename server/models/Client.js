import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    clientType: {
      type: String,
      enum: ["architect", "designer", "direct_client", "factory_manager"],
      required: true,
    },

    name:     { type: String, required: true, trim: true },
    firmName: { type: String, trim: true },
    phone:    { type: String, required: true },
    whatsappNumber: { type: String },
    email:    { type: String, lowercase: true },

    address: {
      houseNumber: String,
      line1:   String,
      line2:   String,
      city:    String,
      state:   String,
      pincode: String,
    },

    // GST — verified via GSTIN API
    gstin:           { type: String, uppercase: true },
    gstVerified:     { type: Boolean, default: false },
    gstBusinessName: { type: String },                   // returned by API
    gstState:        { type: String },
    gstStatus:       { type: String },                   // Active / Cancelled / Suspended
    taxType: {
      type: String,
      enum: ["regular", "composition", "urp"],           // urp = unregistered person
    },
    gstVerifiedAt: { type: Date },

    notes:    { type: String },
    isActive: { type: Boolean, default: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

clientSchema.index({ companyId: 1 });
clientSchema.index({ companyId: 1, phone: 1 });

export default mongoose.model("Client", clientSchema);