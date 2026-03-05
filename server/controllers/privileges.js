import { Role } from '../models/Role.js';

// ── GET /api/privileges ───────────────────────────────────────────────────────
// List all roles for this company
export const getRoles = async (req, res, next) => {
  try {
    const roles = await Role.find({ companyId: req.user.companyId })
      .sort({ isSystem: -1, name: 1 })
      .lean();

    res.status(200).json({ success: true, data: roles });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/privileges/:id ───────────────────────────────────────────────────
export const getRoleById = async (req, res, next) => {
  try {
    const role = await Role.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    }).lean();

    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    res.status(200).json({ success: true, data: role });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/privileges ──────────────────────────────────────────────────────
// Create a new custom role
export const createRole = async (req, res, next) => {
  try {
    const { name, permissions = [], dataScope = 'own' } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }

    const existing = await Role.findOne({ companyId: req.user.companyId, name: name.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A role with this name already exists' });
    }

    const role = await Role.create({
      companyId:   req.user.companyId,
      name:        name.trim(),
      isSystem:    false,
      permissions,
      dataScope,
      createdBy:   req.user.userId,
    });

    res.status(201).json({ success: true, data: role, message: 'Role created successfully' });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/privileges/:id ───────────────────────────────────────────────────
export const updateRole = async (req, res, next) => {
  try {
    const role = await Role.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    if (role.isSystem) {
      return res.status(403).json({ success: false, message: 'System roles cannot be modified' });
    }

    const { name, permissions, dataScope, isActive } = req.body;
    if (name        !== undefined) role.name        = name.trim();
    if (permissions !== undefined) role.permissions = permissions;
    if (dataScope   !== undefined) role.dataScope   = dataScope;
    if (isActive    !== undefined) role.isActive    = isActive;

    await role.save();
    res.status(200).json({ success: true, data: role, message: 'Role updated successfully' });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/privileges/:id ────────────────────────────────────────────────
export const deleteRole = async (req, res, next) => {
  try {
    const role = await Role.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    if (role.isSystem) {
      return res.status(403).json({ success: false, message: 'System roles cannot be deleted' });
    }

    await role.deleteOne();
    res.status(200).json({ success: true, message: 'Role deleted successfully' });
  } catch (err) {
    next(err);
  }
};
