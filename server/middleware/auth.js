import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

/**
 * authenticateJWT
 * Reads Bearer token → verifies → attaches req.user
 * req.user = { userId, companyId, role, isSuperAdmin }
 */
export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let companyId = decoded.companyId;

    // Super admin company switcher: honour X-Company-Id header
    if (decoded.isSuperAdmin && req.headers['x-company-id']) {
      companyId = req.headers['x-company-id'];
    }

    req.user = {
      userId:      decoded.userId,
      companyId,
      role:        decoded.role,
      isSuperAdmin: decoded.isSuperAdmin || false,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
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
