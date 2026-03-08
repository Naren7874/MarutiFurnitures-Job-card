import Client from '../models/Client.js';
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
    res.status(200).json({ success: true, data: client });
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
