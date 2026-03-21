import Company from '../models/Company.js';
import { Counter } from '../models/Counter.js';
import { auditLog } from '../utils/auditLogger.js';

// ── GET /api/companies (Super Admin only) ────────────────────────────────────

export const getCompanies = async (req, res, next) => {
  try {
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Super admin only' });
    }

    const { search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { gstin: new RegExp(search, 'i') },
      ];
    }

    const [companies, total] = await Promise.all([
      Company.find(filter)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Company.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: companies,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/companies/:id ───────────────────────────────────────────────────

export const getCompanyById = async (req, res, next) => {
  try {
    // Users can only view their own company unless they are super_admin
    if (!req.user.isSuperAdmin && req.params.id !== req.user.companyId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this company' });
    }

    const company = await Company.findById(req.params.id).lean();
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    res.status(200).json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/companies/:id — Updates company (logo, branding, prefixes, GST rates) ──

export const updateCompany = async (req, res, next) => {
  try {
    // Users can only update their own company unless they are super_admin
    if (!req.user.isSuperAdmin && req.params.id !== req.user.companyId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this company' });
    }

    const PROTECTED = ['slug', 'isActive']; // Prevent slug changes via this route
    if (!req.user.isSuperAdmin) {
      PROTECTED.push('isActive');
    }
    PROTECTED.forEach(f => delete req.body[f]);

    const company = await Company.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    auditLog(req, {
      action: 'update',
      resourceType: 'Company',
      resourceId: company._id,
      resourceLabel: company.name,
      metadata: { updatedFields: Object.keys(req.body) },
    });

    res.status(200).json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/companies/:id/reset-sequences — Deletes counters for this company ──

export const resetCompanySequences = async (req, res, next) => {
  try {
    // Only super_admin or company admin with settings.edit privilege
    if (!req.user.isSuperAdmin && req.params.id !== req.user.companyId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Delete all counter documents for this company. 
    // Keys start with companyId
    const result = await Counter.deleteMany({ _id: new RegExp(`^${req.params.id}_`) });

    auditLog(req, {
      action: 'delete',
      resourceType: 'Counter',
      resourceId: req.params.id,
      resourceLabel: 'All Company Sequences',
      metadata: { deletedCount: result.deletedCount },
    });

    res.status(200).json({ success: true, message: `Successfully reset ${result.deletedCount} sequence counters.` });
  } catch (err) {
    next(err);
  }
};
