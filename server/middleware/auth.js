import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { UserPermission } from '../models/UserPermission.js';
import Company from '../models/Company.js';

/**
 * authenticateJWT
 *
 * Reads Bearer token → verifies → attaches req.user
 * ALSO checks:
 *   - user.isActive  → 401 if account is deactivated
 *   - tokenVersion   → 401 if token was issued before the last deactivate/reactivate cycle
 *
 * req.user = { userId, companyId, role, isSuperAdmin, name, department, tokenVersion }
 */
export const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  try {
    // Fetch user basic info
    const user = await User.findById(decoded.userId)
      .select('isActive tokenVersion isSuperAdmin name profilePhoto')
      .lean();

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated. Contact admin.' });
    }

    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    // Determine the active companyId
    let companyId = decoded.companyId;
    if (user.isSuperAdmin && req.headers['x-company-id']) {
      companyId = req.headers['x-company-id'];
    }

    // Fetch the company-specific permission/role context
    const permission = await UserPermission.findOne({ userId: user._id, companyId }).lean();
    if (!permission && !user.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized for this company' });
    }

    req.user = {
      userId:       user._id,
      companyId,
      role:         permission?.role || (user.isSuperAdmin ? 'super_admin' : null),
      isSuperAdmin: user.isSuperAdmin,
      name:         user.name,
      department:   permission?.department || null,
      tokenVersion: user.tokenVersion,
      profilePhoto: user.profilePhoto,
    };

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * authenticateArchitect
 *
 * Lightweight auth for cross-company architect API routes.
 * Does NOT require a UserPermission record — architects are cross-company.
 * Attaches req.user = { userId, role, name }
 */
export const authenticateArchitect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  try {
    const user = await User.findById(decoded.userId)
      .select('isActive tokenVersion name email role profilePhoto')
      .lean();

    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    if (!user.isActive) return res.status(401).json({ success: false, message: 'Account is deactivated.' });
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    req.user = {
      userId:       user._id,
      role:         user.role,
      name:         user.name,
      email:        user.email,
      profilePhoto: user.profilePhoto,
    };

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * requireSuperAdmin
 * Must be used AFTER authenticateJWT
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'Super admin access required' });
  }
  next();
};

/**
 * requireRole(...roles)
 * Usage: requireRole('sales', 'super_admin')
 */
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient role' });
  }
  next();
};
