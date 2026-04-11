import mongoose from "mongoose";

const dispatchMemberSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    name:      { type: String, required: true, trim: true },
    phone:     { type: String, trim: true },
    isActive:  { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Ensure name is unique per company
dispatchMemberSchema.index({ companyId: 1, name: 1 }, { unique: true });

export default mongoose.model("DispatchMember", dispatchMemberSchema);
