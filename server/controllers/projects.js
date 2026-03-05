import Project from '../models/Project.js';
import Quotation from '../models/Quotation.js';
import Company from '../models/Company.js';
import { generateProjectNumber } from '../utils/autoNumber.js';

// ── POST /api/projects ───────────────────────────────────────────────────────

export const createProject = async (req, res, next) => {
  try {
    const { quotationId, priority, expectedDelivery, assignedStaff } = req.body;

    // Fetch approved quotation
    const quotation = await Quotation.findOne({
      _id:       quotationId,
      companyId: req.user.companyId,
      status:    'approved',
    }).populate('clientId', 'gstin name').lean();

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Approved quotation not found',
      });
    }

    const company = await Company.findById(req.user.companyId).lean();
    const projectNumber = await generateProjectNumber(req.user.companyId, company.projectPrefix);

    const project = await Project.create({
      companyId:    req.user.companyId,
      projectNumber,
      clientId:     quotation.clientId._id,
      quotationId:  quotation._id,

      // Copy from quotation — project stands alone even if quotation is revised later
      projectName:  quotation.projectName,
      architect:    quotation.architect,
      siteAddress:  quotation.siteAddress,
      clientGstin:  quotation.clientId?.gstin,

      priority:         priority || 'medium',
      expectedDelivery: expectedDelivery,
      assignedStaff:    assignedStaff || [],
      status:           'active',
      createdBy:        req.user.userId,
    });

    // Mark quotation as converted
    await Quotation.findByIdAndUpdate(quotation._id, { status: 'converted', projectId: project._id });

    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/projects ────────────────────────────────────────────────────────

export const getProjects = async (req, res, next) => {
  try {
    const { status, priority, search, page = 1, limit = 20 } = req.query;
    const filter = { ...req.companyFilter };

    if (status)   filter.status   = status;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { projectNumber: new RegExp(search, 'i') },
        { projectName:   new RegExp(search, 'i') },
      ];
    }

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate('clientId', 'name firmName phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Project.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: projects,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/projects/:id ────────────────────────────────────────────────────

export const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, ...req.companyFilter })
      .populate('clientId')
      .populate('quotationId', 'quotationNumber grandTotal status')
      .populate('assignedStaff', 'name role department profilePhoto')
      .lean();

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Attach job cards for this project
    const JobCard = (await import('../models/JobCard.js')).default;
    const jobCards = await JobCard.find({ projectId: project._id, companyId: req.user.companyId })
      .select('jobCardNumber title status priority expectedDelivery')
      .lean();

    res.status(200).json({ success: true, data: { ...project, jobCards } });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/projects/:id/whatsapp ─────────────────────────────────────────

export const saveWhatsAppGroup = async (req, res, next) => {
  try {
    const { groupName, groupId, groupLink } = req.body;

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, ...req.companyFilter },
      { whatsapp: { groupName, groupId, groupLink, groupCreatedAt: new Date(), groupCreatedBy: req.user.userId } },
      { new: true }
    );

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.status(200).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/projects/:id/status ──────────────────────────────────────────

export const updateProjectStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, ...req.companyFilter },
      { status },
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.status(200).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/projects/:id ────────────────────────────────────────────────────

export const updateProject = async (req, res, next) => {
  try {
    const PROTECTED = ['companyId', 'projectNumber', 'quotationId', 'createdBy'];
    PROTECTED.forEach((f) => delete req.body[f]);

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, ...req.companyFilter },
      req.body,
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.status(200).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};
