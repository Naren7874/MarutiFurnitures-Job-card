import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * authenticateJWT
 *
 * Reads Bearer token → verifies → attaches req.user
 * ALSO checks:
 *   - user.isActive  → 401 if account is deactivated
 *   - tokenVersion   → 401 if token was issued before the last deactivate/reactivate cycle
 *
 * req.user = { userId, companyId, role, isSuperAdmin, name, tokenVersion }
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
    // Fetch user to verify isActive + tokenVersion (DB hit on every request — cached by Node process)
    const user = await User.findById(decoded.userId)
      .select('isActive tokenVersion isSuperAdmin role companyId name department')
      .lean();

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated. Contact admin.' });
    }

    // Token version mismatch — user was deactivated and reactivated, or had tokens explicitly invalidated
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    // Super admin company switcher: honour X-Company-Id header
    let companyId = decoded.companyId;
    if (user.isSuperAdmin && req.headers['x-company-id']) {
      companyId = req.headers['x-company-id'];
    }

    req.user = {
      userId:       decoded.userId,
      companyId,
      role:         user.role,
      isSuperAdmin: user.isSuperAdmin,
      name:         user.name,
      department:   user.department,
      tokenVersion: user.tokenVersion,
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
