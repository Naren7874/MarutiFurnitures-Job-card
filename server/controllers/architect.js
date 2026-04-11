import Quotation from '../models/Quotation.js';
import Client from '../models/Client.js';
import Company from '../models/Company.js';
import Project from '../models/Project.js';
import JobCard from '../models/JobCard.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

/**
 * Resolves the "architectId" to use for all queries.
 * - If user is a project_designer, find their linked architect via teamEmail === user email.
 * - Otherwise, return the logged-in user's own ID.
 */
const resolveArchitectId = async (req) => {
  const isProjectDesigner =
    req.user.role === 'project_designer' ||
    req.user.role?.toLowerCase() === 'project designer';

  if (isProjectDesigner) {
    // Find the architect whose teamEmail matches this project_designer's email
    const arch = await User.findOne({ teamEmail: req.user.email }).select('_id').lean();
    if (arch) return new mongoose.Types.ObjectId(arch._id);
    // Fallback: use own ID (will show empty data if no architect linked)
    return new mongoose.Types.ObjectId(req.user.userId);
  }

  return new mongoose.Types.ObjectId(req.user.userId);
};

/**
 * GET /api/architect/dashboard
 * Cross-company summary for the logged-in architect.
 */
export const getArchitectDashboard = async (req, res, next) => {
  try {
    const architectId = await resolveArchitectId(req);

    // All quotations associated with this architect across ALL companies
    const allQuotations = await Quotation.find({ architectId })
      .populate('clientId', 'name firmName phone')
      .populate('companyId', 'name logo')
      .select('quotationNumber projectName status subtotal grandTotal architectCommissionPercent architectCommissionAmount companyId clientId createdAt approvedAt')
      .sort({ createdAt: -1 })
      .lean();

    const quotationIds = allQuotations.map(q => q._id);

    // Fetch related projects and job cards for accurate KPI metrics
    const [allProjects, allJobCards] = await Promise.all([
      Project.find({ quotationId: { $in: quotationIds } }).select('status').lean(),
      JobCard.find({ quotationId: { $in: quotationIds } }).select('status').lean()
    ]);

    const approvedStatuses = ['approved', 'converted'];

    let totalEarned = 0;
    let totalPending = 0;
    const clientIds = new Set();

    let pendingQuotations = 0;
    let rejectedQuotations = 0;

    allQuotations.forEach(q => {
      const commAmount = q.architectCommissionAmount || 0;
      if (approvedStatuses.includes(q.status)) {
        totalEarned += commAmount;
      } else {
        totalPending += commAmount;
      }
      if (q.clientId?._id) clientIds.add(String(q.clientId._id));

      if (['draft', 'sent'].includes(q.status)) pendingQuotations++;
      if (q.status === 'rejected') rejectedQuotations++;
    });

    const ongoingProjects = allProjects.filter(p => !['completed', 'cancelled'].includes(p.status)).length;
    const completedProjects = allProjects.filter(p => p.status === 'completed').length;
    
    // Active job cards (any status other than closed/cancelled/delivered)
    const activeJobCards = allJobCards.filter(jc => !['closed', 'cancelled', 'delivered'].includes(jc.status)).length;

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
          earnedOoroo: +(totalEarned / 1000).toFixed(2),
          pendingOoroo: +(totalPending / 1000).toFixed(2),
          totalOoroo: +((totalEarned + totalPending) / 1000).toFixed(2),
          totalQuotations: allQuotations.length,
          totalClients: clientIds.size,
          ongoingProjects,
          completedProjects,
          activeJobCards,
          pendingQuotations,
          rejectedQuotations,
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
    const architectId = await resolveArchitectId(req);
    const { status, clientId, search, page = 1, limit = 20 } = req.query;

    const filter = { architectId };

    if (status && status !== 'all') filter.status = status;
    if (clientId && clientId !== 'all') filter.clientId = clientId;
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
    const architectId = await resolveArchitectId(req);

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
    const architectId = await resolveArchitectId(req);

    const quotation = await Quotation.findOne({ _id: req.params.id, architectId })
      .populate('clientId')
      .populate('companyId', 'name logo address phone email')
      .lean();

    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    // Fetch linked project and jobcards
    const project = await Project.findOne({ quotationId: quotation._id }).select('_id projectNumber').lean();
    const jobCards = await JobCard.find({ quotationId: quotation._id }).select('_id jobCardNumber title').lean();

    res.status(200).json({ 
      success: true, 
      data: { 
        ...quotation, 
        projectId: project?._id, 
        projectNumber: project?.projectNumber,
        jobCards 
      } 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/architect/projects
 * List all projects linked to this architect's quotations.
 */
export const getArchitectProjects = async (req, res, next) => {
  try {
    const architectId = await resolveArchitectId(req);
    const { search, status, clientId, page = 1, limit = 20 } = req.query;

    const quotations = await Quotation.find({ architectId }).select('_id').lean();
    const qIds = quotations.map(q => q._id);

    const filter = { quotationId: { $in: qIds } };
    if (status && status !== 'all') filter.status = status;
    if (clientId && clientId !== 'all') filter.clientId = clientId;
    if (search) {
      filter.$or = [
        { projectName: new RegExp(search, 'i') },
        { projectNumber: new RegExp(search, 'i') },
      ];
    }

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate('clientId', 'name firmName')
        .populate('companyId', 'name logo')
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      Project.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: projects,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/architect/projects/:id
 */
export const getArchitectProjectById = async (req, res, next) => {
  try {
    const architectId = await resolveArchitectId(req);
    const project = await Project.findById(req.params.id)
      .populate('clientId')
      .populate('companyId', 'name logo address phone email')
      .populate('quotationId')
      .lean();

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Security check: is this project linked to an architect's quotation?
    const quotation = await Quotation.findOne({ _id: project.quotationId, architectId }).select('_id');
    if (!quotation) return res.status(403).json({ success: false, message: 'Access denied' });

    // Fetch related job cards
    const jobCards = await JobCard.find({ projectId: project._id })
      .select('jobCardNumber title status items createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: { ...project, jobCards } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/architect/jobcards
 */
export const getArchitectJobCards = async (req, res, next) => {
  try {
    const architectId = await resolveArchitectId(req);
    const { search, status, clientId, page = 1, limit = 20 } = req.query;

    const quotations = await Quotation.find({ architectId }).select('_id').lean();
    const qIds = quotations.map(q => q._id);

    const filter = { quotationId: { $in: qIds } };
    if (status && status !== 'all') filter.status = status;
    if (clientId && clientId !== 'all') filter.clientId = clientId;
    if (search) {
      filter.$or = [
        { jobCardNumber: new RegExp(search, 'i') },
        { title: new RegExp(search, 'i') },
      ];
    }

    const [jobCards, total] = await Promise.all([
      JobCard.find(filter)
        .populate('clientId', 'name firmName')
        .populate('companyId', 'name logo')
        .populate('projectId', 'projectName')
        .populate('assignedTo.production', 'name role profilePhoto')
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      JobCard.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: jobCards,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/architect/jobcards/:id
 */
export const getArchitectJobCardById = async (req, res, next) => {
  try {
    const architectId = await resolveArchitectId(req);
    const jobCard = await JobCard.findById(req.params.id)
      .populate('clientId')
      .populate('companyId', 'name logo address phone email')
      .populate('projectId', 'projectName')
      .populate('quotationId', 'quotationNumber')
      .lean();

    if (!jobCard) return res.status(404).json({ success: false, message: 'Job Card not found' });

    // Security check
    const quotation = await Quotation.findOne({ _id: jobCard.quotationId, architectId }).select('_id');
    if (!quotation) return res.status(403).json({ success: false, message: 'Access denied' });

    res.status(200).json({ success: true, data: jobCard });
  } catch (err) {
    next(err);
  }
};
