import Project from '../models/Project.js';
import Quotation from '../models/Quotation.js';
import Company from '../models/Company.js';
import JobCard from '../models/JobCard.js';
import { Invoice } from '../models/Invoice.js';
import { ProductionStage } from '../models/ProductionStage.js';
import { QcStage } from '../models/QcStage.js';
import { DispatchStage } from '../models/DispatchStage.js';
import { generateProjectNumber } from '../utils/autoNumber.js';
import { auditLog } from '../utils/auditLogger.js';

// ── POST /api/projects ───────────────────────────────────────────────────────

export const createProject = async (req, res, next) => {
  try {
    const { quotationId, priority, expectedDelivery, assignedStaff } = req.body;

    const quotation = await Quotation.findOne({
      _id:       quotationId,
      companyId: req.user.companyId,
      status:    'approved',
    }).populate('clientId', 'gstin name').lean();

    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Approved quotation not found' });
    }

    const company = await Company.findById(req.user.companyId).lean();
    const projectNumber = await generateProjectNumber(req.user.companyId, company.projectPrefix);

    const project = await Project.create({
      companyId:    req.user.companyId,
      projectNumber,
      clientId:     quotation.clientId._id,
      quotationId:  quotation._id,
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

    auditLog(req, {
      action: 'create',
      resourceType: 'Project',
      resourceId: project._id,
      resourceLabel: `${projectNumber} — ${quotation.projectName}`,
      metadata: { quotationId: quotation._id, priority, assignedStaff: assignedStaff?.length || 0 },
    });

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

    auditLog(req, {
      action: 'update',
      resourceType: 'Project',
      resourceId: project._id,
      resourceLabel: project.projectNumber,
      metadata: { action: 'whatsapp_group_linked', groupName },
    });

    res.status(200).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/projects/:id/status ──────────────────────────────────────────

export const updateProjectStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const prev = await Project.findOne({ _id: req.params.id, ...req.companyFilter }).lean();

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, ...req.companyFilter },
      { status },
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    auditLog(req, {
      action: 'update',
      resourceType: 'Project',
      resourceId: project._id,
      resourceLabel: project.projectNumber,
      changes: { status: { from: prev?.status, to: status } },
    });

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

    // Snapshot for tracking changes
    const prev = await Project.findOne({ _id: req.params.id, ...req.companyFilter }).lean();

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, ...req.companyFilter },
      req.body,
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const changes = {};
    const tracked = ['projectName', 'architect', 'architectContact', 'projectDesigner', 'projectDesignerContact', 'priority', 'status', 'expectedDelivery'];
    tracked.forEach(f => {
      if (prev && String(prev[f]) !== String(project[f])) {
        changes[f] = { from: prev[f], to: project[f] };
      }
    });

    auditLog(req, {
      action: 'update',
      resourceType: 'Project',
      resourceId: project._id,
      resourceLabel: project.projectNumber,
      changes: Object.keys(changes).length ? changes : undefined,
    });

    res.status(200).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/projects/:id ───────────────────────────────────────────────
export const deleteProject = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const project = await Project.findOne({ _id: projectId, ...req.companyFilter }).lean();

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // 1. Identify all Job Cards linked to this project
    const jobCards = await JobCard.find({ projectId, companyId: req.user.companyId }).select('_id').lean();
    const jobCardIds = jobCards.map(jc => jc._id);

    // 2. Cascade delete all related records in stages
    await Promise.all([
      ProductionStage.deleteMany({ jobCardId: { $in: jobCardIds } }),
      QcStage.deleteMany({ jobCardId: { $in: jobCardIds } }),
      DispatchStage.deleteMany({ jobCardId: { $in: jobCardIds } })
    ]);

    // 3. Delete Job Cards
    await JobCard.deleteMany({ projectId, companyId: req.user.companyId });

    // 4. Delete Invoices
    await Invoice.deleteMany({ projectId, companyId: req.user.companyId });

    // 5. Update associated Quotation (mark as no longer converted)
    if (project.quotationId) {
      await Quotation.findByIdAndUpdate(project.quotationId, { 
        status: 'approved', 
        $unset: { projectId: 1 } 
      });
    }

    // 6. Delete the Project itself
    await Project.deleteOne({ _id: projectId, companyId: req.user.companyId });

    auditLog(req, {
      action: 'delete',
      resourceType: 'Project',
      resourceId: projectId,
      resourceLabel: project.projectNumber,
      metadata: { 
        projectName: project.projectName,
        jobCardsDeletedCount: jobCardIds.length 
      },
    });

    res.status(200).json({ 
      success: true, 
      message: 'Project and all associated records deleted successfully' 
    });
  } catch (err) {
    next(err);
  }
};
