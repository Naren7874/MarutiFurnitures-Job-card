import mongoose from "mongoose";
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    name:  { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true },

    phone:          { type: String },
    whatsappNumber: { type: String },
    profilePhoto:   { type: String },                    // Cloudinary URL

    role: {
      type: String,
      enum: [
        "super_admin",   // owner — cross-company, full access
        "sales",
        "design",
        "store",
        "production",
        "qc",
        "dispatch",
        "accountant",
        "client",
      ],
      required: true,
    },

    // Primary department — helps with data scoping + dashboard filtering
    // (separate from role so privilege overrides can span departments)
    department: {
      type: String,
      enum: ["sales", "design", "store", "production", "qc", "dispatch", "accounts", "management"],
    },

    // super_admin only — can switch between companies
    isSuperAdmin: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },

    // JWT invalidation — bump this number to invalidate ALL existing tokens for this user
    // (used on deactivate so old tokens are rejected immediately without a blacklist)
    tokenVersion: { type: Number, default: 0 },

    // Password reset
    resetPasswordToken:   { type: String },
    resetPasswordExpires: { type: Date },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Unique email per company
userSchema.index({ companyId: 1, email: 1 }, { unique: true });

// Hash password before save
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});


// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("User", userSchema);