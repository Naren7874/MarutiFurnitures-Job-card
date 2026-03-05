import Company from '../models/Company.js';

/**
 * attachCompany
 * Loads full company document from DB using req.user.companyId
 * Attaches it as req.company
 * Must be used AFTER authenticateJWT
 */
export const attachCompany = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return res.status(401).json({ success: false, message: 'Company context missing' });
    }

    const company = await Company.findById(req.user.companyId).lean();

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    if (!company.isActive) {
      return res.status(403).json({ success: false, message: 'Company account is inactive' });
    }

    req.company = company;
    next();
  } catch (err) {
    next(err);
  }
};
