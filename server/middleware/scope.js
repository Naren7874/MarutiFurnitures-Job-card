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
  if (!req.user?.companyId) {
    return res.status(401).json({ success: false, message: 'No company scope available' });
  }
  req.companyFilter = { companyId: req.user.companyId };
  next();
};
