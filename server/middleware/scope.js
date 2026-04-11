/**
 * injectCompanyScope
 * Attaches req.companyFilter = { companyId: req.user.companyId }
 * Controllers spread this into every DB query to ensure data isolation.
 *
 * Usage:
 *   const clients = await Client.find({ ...req.companyFilter, isActive: true });
 *
 * Must be used AFTER authenticateJWT.
 */
export const injectCompanyScope = (req, res, next) => {
  // Global roles like 'dispatch' can operate without a fixed company scope
  if (req.user?.role === 'dispatch') {
    req.companyFilter = {}; // Dispatch role is cross-company/global
    return next();
  }

  if (!req.user?.companyId) {
    return res.status(401).json({ success: false, message: 'No company scope available' });
  }
  req.companyFilter = { companyId: req.user.companyId };
  next();
};
