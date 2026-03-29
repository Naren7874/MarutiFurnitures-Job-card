import mongoose from "mongoose";
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      // Non-required allows global user creation without immediate company bind,
      // though typically they'll have a "home" company.
    },

    firstName:  { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    lastName:   { type: String, required: true, trim: true },
    name:       { type: String, trim: true }, // Full name, auto-computed
    email:      { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true },

    phone: { type: String },
    whatsappNumber: { type: String },
    profilePhoto: { type: String },                    // Cloudinary URL

    // Professional fields (for Architects, Designers, Managers)
    firmName:        { type: String, trim: true },
    factoryName:     { type: String, trim: true },
    factoryLocation: { type: String, trim: true },

    role: {
      type: String,
      required: true,
      // No enum — supports both system roles (super_admin, sales, design, etc.)
      // and custom role name strings. The actual permission set is resolved via
      // UserPermission.roleId → Role collection.
    },

    // Reference to the Role document that drives this user's effective permissions.
    // For system roles this is auto-populated at user creation.
    // For custom roles this points to the custom Role document.
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },

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
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Global unique email (staff are common across companies)
userSchema.index({ email: 1 }, { unique: true });

// Populate full name before save
userSchema.pre("save", async function () {
  this.name = [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
  
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});


// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("User", userSchema);