import Quotation from '../models/Quotation.js';
import Client from '../models/Client.js';
import Company from '../models/Company.js';
import mongoose from 'mongoose';

/**
 * GET /api/architect/dashboard
 * Cross-company summary for the logged-in architect.
 * - Total earned commission (status === 'approved' | 'converted')
 * - Total pending commission (status: 'draft' | 'sent')
 * - Quotation counts, client counts
 * - Recent 5 quotations
 */
export const getArchitectDashboard = async (req, res, next) => {
  try {
    const architectId = new mongoose.Types.ObjectId(req.user.userId);

    // All quotations associated with this architect across ALL companies
    const allQuotations = await Quotation.find({ architectId })
      .populate('clientId', 'name firmName phone')
      .populate('companyId', 'name logo')
      .select('quotationNumber projectName status subtotal grandTotal architectCommissionPercent architectCommissionAmount companyId clientId createdAt approvedAt')
      .sort({ createdAt: -1 })
      .lean();

    const approvedStatuses = ['approved', 'converted'];

    let totalEarned = 0;
    let totalPending = 0;
    const clientIds = new Set();

    allQuotations.forEach(q => {
      const commAmount = q.architectCommissionAmount || 0;
      if (approvedStatuses.includes(q.status)) {
        totalEarned += commAmount;
      } else {
        totalPending += commAmount;
      }
      if (q.clientId?._id) clientIds.add(String(q.clientId._id));
    });

    // Count by status
    const statusBreakdown = allQuotations.reduce((acc, q) => {
      acc[q.status] = (acc[q.status] || 0) + 1;
      return acc;
    }, {});

    // Recent 5
    const recentQuotations = allQuotations.slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalEarned: +totalEarned.toFixed(2),
          totalPending: +totalPending.toFixed(2),
          totalCommission: +(totalEarned + totalPending).toFixed(2),
          totalQuotations: allQuotations.length,
          totalClients: clientIds.size,
          statusBreakdown,
        },
        recentQuotations,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/architect/quotations
 * Paginated list of all quotations for this architect across all companies.
 * Query params: page, limit, status, search
 */
export const getArchitectQuotations = async (req, res, next) => {
  try {
    const architectId = new mongoose.Types.ObjectId(req.user.userId);
    const { status, search, page = 1, limit = 20 } = req.query;

    const filter = { architectId };

    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { quotationNumber: new RegExp(search, 'i') },
        { projectName: new RegExp(search, 'i') },
      ];
    }

    const [quotations, total] = await Promise.all([
      Quotation.find(filter)
        .populate('clientId', 'name firmName phone')
        .populate('companyId', 'name logo')
        .select('quotationNumber projectName status subtotal grandTotal architectCommissionPercent architectCommissionAmount companyId clientId createdAt approvedAt')
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      Quotation.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: quotations,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/architect/clients
 * Distinct clients from this architect's quotations.
 */
export const getArchitectClients = async (req, res, next) => {
  try {
    const architectId = new mongoose.Types.ObjectId(req.user.userId);

    // Get distinct clientIds
    const clientIds = await Quotation.distinct('clientId', { architectId });

    const clients = await Client.find({ _id: { $in: clientIds } })
      .select('name firmName phone email address')
      .lean();

    // Enrich with quotation count per client
    const countsByClient = await Quotation.aggregate([
      { $match: { architectId, clientId: { $in: clientIds } } },
      { $group: { _id: '$clientId', count: { $sum: 1 }, totalCommission: { $sum: '$architectCommissionAmount' } } },
    ]);

    const countMap = Object.fromEntries(countsByClient.map(c => [String(c._id), { count: c.count, totalCommission: c.totalCommission }]));

    const enriched = clients.map(c => ({
      ...c,
      quotationCount: countMap[String(c._id)]?.count || 0,
      totalCommission: countMap[String(c._id)]?.totalCommission || 0,
    }));

    res.status(200).json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/architect/quotations/:id
 * Single quotation detail — only if architect is associated.
 */
export const getArchitectQuotationById = async (req, res, next) => {
  try {
    const architectId = new mongoose.Types.ObjectId(req.user.userId);

    const quotation = await Quotation.findOne({ _id: req.params.id, architectId })
      .populate('clientId')
      .populate('companyId', 'name logo address phone email')
      .lean();

    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    res.status(200).json({ success: true, data: quotation });
  } catch (err) {
    next(err);
  }
};
