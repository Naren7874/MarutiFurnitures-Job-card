import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Company from '../models/Company.js';
import { Role } from '../models/Role.js';
import { UserPermission } from '../models/UserPermission.js';
import { resolvePermissions } from '../utils/resolvePermissions.js';
import { sendEmail, passwordResetEmailHTML } from '../utils/sendEmail.js';
import { auditLog } from '../utils/auditLogger.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });

const buildTokenPayload = (user) => ({
  userId: user._id,
  companyId: user.companyId,
  role: user.role,
  department: user.department,
  isSuperAdmin: user.isSuperAdmin,
  tokenVersion: user.tokenVersion || 0,  // Used to invalidate tokens on deactivate
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const query = { email: email.toLowerCase() };
    const user = await User.findOne(query).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }


    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account is inactive. Contact admin.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update last login
    await User.updateOne({ _id: user._id }, { lastLogin: new Date() });

    // Fetch all companies where this user has a mission
    const permissions = await UserPermission.find({ userId: user._id }).lean();
    const authorizedCompanyIds = permissions
      .filter(p => p.companyId)
      .map(p => p.companyId.toString());

    let allCompanies = [];
    if (user.isSuperAdmin) {
      // Super Admin sees everything
      const companies = await Company.find({ isActive: true }).lean();
      allCompanies = companies.map(c => ({
        id: c._id, name: c.name, slug: c.slug, logo: c.logo, gstin: c.gstin
      }));
    } else {
      // Regular staff see their authorized companies
      const companies = await Company.find({ _id: { $in: authorizedCompanyIds }, isActive: true }).lean();
      allCompanies = companies.map(c => ({
        id: c._id, name: c.name, slug: c.slug, logo: c.logo, gstin: c.gstin
      }));
    }

    // Default company to start with:
    // 1. user.companyId if it's still valid/active
    // 2. or the first in allCompanies
    let activeCompanyId = user.companyId;
    if (!activeCompanyId || !allCompanies.find(c => c.id.toString() === activeCompanyId.toString())) {
      activeCompanyId = allCompanies[0]?.id;
    }

    const token = signToken({
      ...buildTokenPayload(user),
      companyId: activeCompanyId
    });

    // Fetch effective permissions for the active company
    const effectivePermissions = await resolvePermissions(user._id, activeCompanyId);

    const loginCompany = allCompanies.find(c => c.id.toString() === (activeCompanyId?.toString() || ''));

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        companyId: activeCompanyId,
        isSuperAdmin: user.isSuperAdmin,
        profilePhoto: user.profilePhoto,
        effectivePermissions,
      },
      company: loginCompany || null,
      allCompanies,
    });
  } catch (err) {
    next(err);
  }
};


// ── POST /api/auth/logout ────────────────────────────────────────────────────

export const logout = (req, res) => {
  // JWT is stateless — client discards token.
  // Audit the logout if we know who is logging out
  if (req.user) {
    auditLog(req, {
      action: 'logout',
      resourceType: 'User',
      resourceId: req.user.userId,
      resourceLabel: req.user.name,
    });
  }
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// ── GET /api/auth/me ─────────────────────────────────────────────────────────

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('companyId', 'name slug logo gstRates')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const activeCompanyId = req.user.companyId;
    const effectivePermissions = await resolvePermissions(user._id, activeCompanyId);

    // Fetch all authorized companies for the switcher
    let allCompanies = [];
    if (user.isSuperAdmin) {
      const companies = await Company.find({ isActive: true }).lean();
      allCompanies = companies.map(c => ({
        id: c._id, name: c.name, slug: c.slug, logo: c.logo, gstin: c.gstin
      }));
    } else {
      const permissions = await UserPermission.find({ userId: user._id }).lean();
      const authorizedCompanyIds = permissions
        .filter(p => p.companyId)
        .map(p => p.companyId.toString());
      const companies = await Company.find({ _id: { $in: authorizedCompanyIds }, isActive: true }).lean();
      allCompanies = companies.map(c => ({
        id: c._id, name: c.name, slug: c.slug, logo: c.logo, gstin: c.gstin
      }));
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        companyId: activeCompanyId,
        isSuperAdmin: user.isSuperAdmin,
        profilePhoto: user.profilePhoto,
        effectivePermissions,
      },
      allCompanies,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/forgot-password ──────────────────────────────────────────

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email?.toLowerCase() });


    // Always return 200 to avoid email enumeration
    if (!user) {
      return res.status(200).json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Password Reset — Maruti Furniture',
      html: passwordResetEmailHTML(user.name, resetUrl),
    });

    res.status(200).json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/reset-password/:token ────────────────────────────────────

export const resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Token is invalid or expired' });
    }

    user.password = req.body.password;          // Pre-save hook re-hashes
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    auditLog(req, {
      action: 'password_reset',
      resourceType: 'User',
      resourceId: user._id,
      resourceLabel: user.name,
      metadata: { method: 'forgot_password_link' },
      // Pass actor explicitly — no JWT on this public route
      actor: { id: user._id, name: user.name, role: user.role, companyId: user.companyId },
    });

    const token = signToken(buildTokenPayload(user));
    res.status(200).json({ success: true, token, message: 'Password reset successful' });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/switch-company (super_admin only) ────────────────────────

export const switchCompany = async (req, res, next) => {
  try {
    const { companySlug } = req.body;

    const company = await Company.findOne({ slug: companySlug, isActive: true }).lean();
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // Authorization check: Super Admin or has a UserPermission record for this company
    if (!req.user.isSuperAdmin) {
      const permission = await UserPermission.findOne({ userId: req.user.userId, companyId: company._id }).lean();
      if (!permission) {
        return res.status(403).json({ success: false, message: 'Not authorized for this company' });
      }
    }

    const user = await User.findById(req.user.userId).lean();
    const newPayload = { ...buildTokenPayload(user), companyId: company._id };
    const token = signToken(newPayload);

    // Fetch new effective permissions for this company context
    const effectivePermissions = await resolvePermissions(user._id, company._id);

    auditLog(req, {
      action: 'switch_company',
      resourceType: 'Company',
      resourceId: company._id,
      resourceLabel: company.name,
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.isSuperAdmin ? 'super_admin' : (await UserPermission.findOne({ userId: user._id, companyId: company._id }).lean())?.role,
        companyId: company._id,
        isSuperAdmin: user.isSuperAdmin,
        effectivePermissions,
      },
      company: { id: company._id, name: company.name, slug: company.slug, logo: company.logo },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/refresh ───────────────────────────────────────────────────

export const refreshToken = async (req, res, next) => {
  try {
    const { token: oldToken } = req.body;
    if (!oldToken) return res.status(400).json({ success: false, message: 'Token is required' });

    // Verify token even if expired
    let decoded;
    try {
      decoded = jwt.verify(oldToken, process.env.JWT_SECRET, { ignoreExpiration: true });
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const user = await User.findById(decoded.userId).lean();
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    // Optional: check tokenVersion to invalidate on logout/password change
    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ success: false, message: 'Token has been revoked' });
    }

    const newToken = signToken(buildTokenPayload(user));

    res.status(200).json({
      success: true,
      token: newToken,
    });
  } catch (err) {
    next(err);
  }
};
