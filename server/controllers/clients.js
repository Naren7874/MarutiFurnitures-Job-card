import Client from '../models/Client.js';
import Quotation from '../models/Quotation.js';
import JobCard from '../models/JobCard.js';
import { auditLog } from '../utils/auditLogger.js';

// ── POST /api/clients ────────────────────────────────────────────────────────

export const createClient = async (req, res, next) => {
  try {
    const client = await Client.create({
      ...req.body,
      companyId: req.user.companyId,
      createdBy: req.user.userId,
    });

    auditLog(req, {
      action: 'create',
      resourceType: 'Client',
      resourceId: client._id,
      resourceLabel: client.firmName || client.name,
    });

    res.status(201).json({ success: true, data: client });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/clients ─────────────────────────────────────────────────────────

export const getClients = async (req, res, next) => {
  try {
    const { search, clientType, isActive = 'true', page = 1, limit = 20 } = req.query;

    const filter = { ...req.companyFilter };
    if (isActive !== 'all') filter.isActive = String(isActive) === 'true';
    if (clientType) filter.clientType = clientType;

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { name: regex },
        { firmName: regex },
        { phone: regex },
        { email: regex },
        { gstin: regex },
      ];
    }

    const [clients, total] = await Promise.all([
      Client.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Client.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: clients,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/clients/:id ─────────────────────────────────────────────────────

export const getClientById = async (req, res, next) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, ...req.companyFilter }).lean();
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    // Fetch operational stats
    const [quotationCount, activeJobCardCount] = await Promise.all([
      Quotation.countDocuments({ clientId: client._id, companyId: req.user.companyId }),
      JobCard.countDocuments({ 
        clientId: client._id, 
        companyId: req.user.companyId,
        status: { $nin: ['closed', 'cancelled'] } 
      }),
    ]);

    res.status(200).json({ 
      success: true, 
      data: { 
        ...client, 
        quotationCount, 
        activeJobCardCount 
      } 
    });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/clients/:id ─────────────────────────────────────────────────────

export const updateClient = async (req, res, next) => {
  try {
    const PROTECTED = ['companyId', 'createdBy', 'gstVerified'];
    PROTECTED.forEach((f) => delete req.body[f]);

    // Snapshot previous for tracking changes
    const prev = await Client.findOne({ _id: req.params.id, ...req.companyFilter }).lean();

    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, ...req.companyFilter },
      req.body,
      { new: true, runValidators: true }
    );
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    // Compute changed fields
    const changes = {};
    const tracked = ['name', 'firmName', 'phone', 'email', 'clientType', 'gstin', 'isActive'];
    tracked.forEach(f => {
      if (prev && String(prev[f]) !== String(client[f])) {
        changes[f] = { from: prev[f], to: client[f] };
      }
    });

    auditLog(req, {
      action: 'update',
      resourceType: 'Client',
      resourceId: client._id,
      resourceLabel: client.firmName || client.name,
      changes: Object.keys(changes).length ? changes : undefined,
    });

    res.status(200).json({ success: true, data: client });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/clients/:id (soft delete) ───────────────────────────────────

export const deactivateClient = async (req, res, next) => {
  try {
    // Only super_admin or users with client.delete permission can deactivate
    // (Note: route already checks client.edit, but specification says sales cannot deactivate)
    if (req.user.role === 'sales' && !req.user.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions: Sales role cannot deactivate clients.' 
      });
    }

    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, ...req.companyFilter },
      { isActive: false },
      { new: true }
    );
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    auditLog(req, {
      action: 'delete',
      resourceType: 'Client',
      resourceId: client._id,
      resourceLabel: client.firmName || client.name,
      metadata: { reason: 'soft_deactivate' },
    });

    res.status(200).json({ success: true, data: client });
  } catch (err) {
    next(err);
  }
};
// ── DELETE /api/clients/:id/permanent ────────────────────────────────────────

export const deleteClient = async (req, res, next) => {
  try {
    // Restrict to super_admin as this is a destructive action
    if (req.user.role === 'sales' && !req.user.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions: Sales role cannot permanently delete clients.' 
      });
    }

    // Check for existing dependencies (Job Cards or Quotations)
    const [quotations, jobCards] = await Promise.all([
      Quotation.findOne({ clientId: req.params.id, companyId: req.user.companyId }),
      JobCard.findOne({ clientId: req.params.id, companyId: req.user.companyId })
    ]);

    if (quotations || jobCards) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete client with existing business records (Quotations or Job Cards).'
      });
    }

    const client = await Client.findOneAndDelete({ 
      _id: req.params.id, 
      ...req.companyFilter 
    });
    
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    auditLog(req, {
      action: 'delete',
      resourceType: 'Client',
      resourceId: client._id,
      resourceLabel: client.firmName || client.name,
      metadata: { reason: 'permanent_delete' },
    });

    res.status(200).json({ success: true, message: 'Client permanently deleted' });
  } catch (err) {
    next(err);
  }
};
