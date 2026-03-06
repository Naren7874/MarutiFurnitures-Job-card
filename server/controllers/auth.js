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
  userId:        user._id,
  companyId:     user.companyId,
  role:          user.role,
  department:    user.department,
  isSuperAdmin:  user.isSuperAdmin,
  tokenVersion:  user.tokenVersion || 0,  // Used to invalidate tokens on deactivate
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
    user.lastLogin = new Date();
    await user.save();

    const token = signToken(buildTokenPayload(user));

    // Audit log — login event (req.user is not set on this public route, pass actor explicitly)
    auditLog(req, {
      action: 'login',
      resourceType: 'User',
      resourceId:    user._id,
      resourceLabel: user.name,
      metadata:      { email: user.email, role: user.role },
      actor: { id: user._id, name: user.name, role: user.role, companyId: user.companyId },
    });

    // Fetch effective permissions for frontend
    const effectivePermissions = await resolvePermissions(user._id);

    // For super admins: return all companies so the frontend can show a switcher
    let allCompanies = [];
    if (user.isSuperAdmin) {
      const companies = await Company.find({ isActive: true }).lean();
      allCompanies = companies.map(c => ({
        id:    c._id,
        name:  c.name,
        slug:  c.slug,
        gstin: c.gstin,
        plan:  c.plan,
      }));
    }

    // Default company = where user is registered (first in list for super admin)
    const loginCompany = await Company.findById(user.companyId).lean();

    res.status(200).json({
      success: true,
      token,
      user: {
        id:          user._id,
        name:        user.name,
        email:       user.email,
        role:        user.role,
        department:  user.department,
        companyId:   user.companyId,
        isSuperAdmin: user.isSuperAdmin,
        profilePhoto: user.profilePhoto,
        effectivePermissions,
      },
      company: loginCompany ? {
        id:    loginCompany._id,
        name:  loginCompany.name,
        slug:  loginCompany.slug,
        gstin: loginCompany.gstin,
        plan:  loginCompany.plan,
      } : null,
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
      resourceId:    req.user.userId,
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

    const effectivePermissions = await resolvePermissions(user._id);

    res.status(200).json({
      success: true,
      user: { ...user, effectivePermissions },
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

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
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
      resetPasswordToken:   hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Token is invalid or expired' });
    }

    user.password = req.body.password;          // Pre-save hook re-hashes
    user.resetPasswordToken   = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

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

    if (!req.user.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Super admin only' });
    }

    const company = await Company.findOne({ slug: companySlug, isActive: true }).lean();
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const user = await User.findById(req.user.userId).lean();
    const newPayload = { ...buildTokenPayload(user), companyId: company._id };
    const token = signToken(newPayload);

    res.status(200).json({
      success: true,
      token,
      company: { id: company._id, name: company.name, slug: company.slug },
    });
  } catch (err) {
    next(err);
  }
};
