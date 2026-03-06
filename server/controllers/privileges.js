import { Role } from '../models/Role.js';
import { PermissionSet, UserPermission } from '../models/UserPermission.js';
import { AuditLog } from '../models/AuditLog.js';
import { AccessLog } from '../models/AccessLog.js';
import User from '../models/User.js';
import { resolvePermissions } from '../utils/resolvePermissions.js';
import { auditLog } from '../utils/auditLogger.js';

// ═══════════════════════════════════════════════════════════════
// SECTION A — ROLE CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/privileges/roles
export const getRoles = async (req, res, next) => {
  try {
    const roles = await Role.find({ companyId: req.user.companyId })
      .sort({ isSystem: -1, name: 1 })
      .lean();
    res.status(200).json({ success: true, data: roles });
  } catch (err) { next(err); }
};

// GET /api/privileges/roles/:id
export const getRoleById = async (req, res, next) => {
  try {
    const role = await Role.findOne({ _id: req.params.id, companyId: req.user.companyId }).lean();
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    res.status(200).json({ success: true, data: role });
  } catch (err) { next(err); }
};

// POST /api/privileges/roles
export const createRole = async (req, res, next) => {
  try {
    const { name, permissions = [], dataScope = 'own' } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Role name is required' });

    const existing = await Role.findOne({ companyId: req.user.companyId, name: name.trim() });
    if (existing) return res.status(400).json({ success: false, message: 'A role with this name already exists' });

    const role = await Role.create({
      companyId: req.user.companyId,
      name: name.trim(),
      isSystem: false,
      permissions,
      dataScope,
      createdBy: req.user.userId,
    });

    auditLog(req, { action: 'create', resourceType: 'Role', resourceId: role._id, resourceLabel: role.name });
    res.status(201).json({ success: true, data: role, message: 'Role created successfully' });
  } catch (err) { next(err); }
};

// PUT /api/privileges/roles/:id
export const updateRole = async (req, res, next) => {
  try {
    const role = await Role.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    if (role.isSystem) return res.status(403).json({ success: false, message: 'System roles cannot be modified' });

    const { name, permissions, dataScope, isActive } = req.body;
    const changes = {};
    if (name        !== undefined) { changes.name = { from: role.name, to: name }; role.name = name.trim(); }
    if (permissions !== undefined) { changes.permissions = { from: role.permissions, to: permissions }; role.permissions = permissions; }
    if (dataScope   !== undefined) { role.dataScope = dataScope; }
    if (isActive    !== undefined) { role.isActive = isActive; }

    await role.save();
    auditLog(req, { action: 'update', resourceType: 'Role', resourceId: role._id, resourceLabel: role.name, changes });
    res.status(200).json({ success: true, data: role, message: 'Role updated successfully' });
  } catch (err) { next(err); }
};

// DELETE /api/privileges/roles/:id
export const deleteRole = async (req, res, next) => {
  try {
    const role = await Role.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    if (role.isSystem) return res.status(403).json({ success: false, message: 'System roles cannot be deleted' });

    await role.deleteOne();
    auditLog(req, { action: 'delete', resourceType: 'Role', resourceId: role._id, resourceLabel: role.name });
    res.status(200).json({ success: true, message: 'Role deleted successfully' });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// SECTION B — PERMISSION SET CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/privileges/permission-sets
export const getPermissionSets = async (req, res, next) => {
  try {
    const sets = await PermissionSet.find({ companyId: req.user.companyId })
      .sort({ name: 1 })
      .lean();
    res.status(200).json({ success: true, data: sets });
  } catch (err) { next(err); }
};

// POST /api/privileges/permission-sets
export const createPermissionSet = async (req, res, next) => {
  try {
    const { name, description, permissions = [] } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Permission set name is required' });

    const set = await PermissionSet.create({
      companyId: req.user.companyId,
      name: name.trim(),
      description,
      permissions,
      createdBy: req.user.userId,
    });

    auditLog(req, { action: 'create', resourceType: 'PermissionSet', resourceId: set._id, resourceLabel: set.name });
    res.status(201).json({ success: true, data: set, message: 'Permission set created' });
  } catch (err) { next(err); }
};

// PUT /api/privileges/permission-sets/:id
export const updatePermissionSet = async (req, res, next) => {
  try {
    const set = await PermissionSet.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!set) return res.status(404).json({ success: false, message: 'Permission set not found' });

    const { name, description, permissions } = req.body;
    const changes = {};
    if (name        !== undefined) { changes.name = { from: set.name, to: name }; set.name = name.trim(); }
    if (description !== undefined) { set.description = description; }
    if (permissions !== undefined) { changes.permissions = { from: set.permissions, to: permissions }; set.permissions = permissions; }

    await set.save();

    // Propagate: rebuild effectivePermissions for all users assigned this set
    const affectedUserPerms = await UserPermission.find({
      permissionSetIds: set._id,
      companyId: req.user.companyId,
    }).lean();

    for (const up of affectedUserPerms) {
      resolvePermissions(up.userId).catch(() => {}); // fire-and-forget per user
    }

    auditLog(req, { action: 'update', resourceType: 'PermissionSet', resourceId: set._id, resourceLabel: set.name, changes });
    res.status(200).json({ success: true, data: set, message: `Permission set updated. ${affectedUserPerms.length} user(s) affected.` });
  } catch (err) { next(err); }
};

// DELETE /api/privileges/permission-sets/:id
export const deletePermissionSet = async (req, res, next) => {
  try {
    const set = await PermissionSet.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!set) return res.status(404).json({ success: false, message: 'Permission set not found' });

    // Find affected users before deletion
    const affectedUserPerms = await UserPermission.find({ permissionSetIds: set._id }).lean();

    // Remove this set from all users
    await UserPermission.updateMany(
      { permissionSetIds: set._id },
      { $pull: { permissionSetIds: set._id } }
    );

    // Rebuild permissions for affected users
    for (const up of affectedUserPerms) {
      resolvePermissions(up.userId).catch(() => {});
    }

    await set.deleteOne();
    auditLog(req, { action: 'delete', resourceType: 'PermissionSet', resourceId: set._id, resourceLabel: set.name });
    res.status(200).json({ success: true, message: 'Permission set deleted' });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// SECTION C — PER-USER PERMISSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// GET /api/privileges/users/:userId — effective perms + overrides + sets
export const getUserPermissions = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Verify user belongs to same company
    const user = await User.findOne({ _id: userId, companyId: req.user.companyId }).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const userPerm = await UserPermission.findOne({ userId })
      .populate('roleId', 'name permissions dataScope')
      .populate('permissionSetIds', 'name description permissions')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        user: { _id: user._id, name: user.name, role: user.role, email: user.email, isActive: user.isActive },
        permissions: userPerm || null,
      },
    });
  } catch (err) { next(err); }
};

// POST /api/privileges/users/:userId/grant
export const grantPermission = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { permission, reason, expiresAt } = req.body;

    if (!permission) return res.status(400).json({ success: false, message: 'permission is required' });

    const user = await User.findOne({ _id: userId, companyId: req.user.companyId }).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const override = {
      permission,
      type: 'grant',
      reason: reason || '',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      grantedBy: req.user.userId,
      grantedAt: new Date(),
    };

    await UserPermission.findOneAndUpdate(
      { userId },
      { $push: { overrides: override } },
      { upsert: true }
    );

    await resolvePermissions(userId);

    auditLog(req, {
      action: 'permission_grant',
      resourceType: 'User',
      resourceId: userId,
      resourceLabel: user.name,
      changes: { permission: { from: null, to: permission } },
      metadata: { reason, expiresAt },
    });

    res.status(200).json({ success: true, message: `Permission "${permission}" granted to ${user.name}` });
  } catch (err) { next(err); }
};

// POST /api/privileges/users/:userId/deny
export const denyPermission = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { permission, reason, expiresAt } = req.body;

    if (!permission) return res.status(400).json({ success: false, message: 'permission is required' });

    const user = await User.findOne({ _id: userId, companyId: req.user.companyId }).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const override = {
      permission,
      type: 'deny',
      reason: reason || '',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      grantedBy: req.user.userId,
      grantedAt: new Date(),
    };

    await UserPermission.findOneAndUpdate(
      { userId },
      { $push: { overrides: override } },
      { upsert: true }
    );

    await resolvePermissions(userId);

    auditLog(req, {
      action: 'permission_deny',
      resourceType: 'User',
      resourceId: userId,
      resourceLabel: user.name,
      changes: { permission: { from: permission, to: 'DENIED' } },
      metadata: { reason, expiresAt },
    });

    res.status(200).json({ success: true, message: `Permission "${permission}" denied for ${user.name}` });
  } catch (err) { next(err); }
};

// DELETE /api/privileges/users/:userId/override/:overrideId
export const removeOverride = async (req, res, next) => {
  try {
    const { userId, overrideId } = req.params;

    const user = await User.findOne({ _id: userId, companyId: req.user.companyId }).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const userPerm = await UserPermission.findOne({ userId });
    if (!userPerm) return res.status(404).json({ success: false, message: 'No permission record found' });

    const overrideToRemove = userPerm.overrides.id(overrideId);
    if (!overrideToRemove) return res.status(404).json({ success: false, message: 'Override not found' });

    const removedPermission = overrideToRemove.permission;
    const removedType = overrideToRemove.type;

    userPerm.overrides.pull({ _id: overrideId });
    await userPerm.save();
    await resolvePermissions(userId);

    auditLog(req, {
      action: 'update',
      resourceType: 'User',
      resourceId: userId,
      resourceLabel: user.name,
      changes: { override_removed: { from: `${removedType}:${removedPermission}`, to: null } },
    });

    res.status(200).json({ success: true, message: 'Override removed and permissions recalculated' });
  } catch (err) { next(err); }
};

// POST /api/privileges/users/:userId/permission-set
export const assignPermissionSet = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { permissionSetId } = req.body;

    if (!permissionSetId) return res.status(400).json({ success: false, message: 'permissionSetId is required' });

    const user = await User.findOne({ _id: userId, companyId: req.user.companyId }).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const set = await PermissionSet.findOne({ _id: permissionSetId, companyId: req.user.companyId }).lean();
    if (!set) return res.status(404).json({ success: false, message: 'Permission set not found' });

    await UserPermission.findOneAndUpdate(
      { userId },
      { $addToSet: { permissionSetIds: permissionSetId } },
      { upsert: true }
    );

    await resolvePermissions(userId);

    auditLog(req, {
      action: 'update',
      resourceType: 'User',
      resourceId: userId,
      resourceLabel: user.name,
      metadata: { permissionSetAdded: set.name },
    });

    res.status(200).json({ success: true, message: `Permission set "${set.name}" assigned to ${user.name}` });
  } catch (err) { next(err); }
};

// DELETE /api/privileges/users/:userId/permission-set/:setId
export const removePermissionSet = async (req, res, next) => {
  try {
    const { userId, setId } = req.params;

    const user = await User.findOne({ _id: userId, companyId: req.user.companyId }).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await UserPermission.findOneAndUpdate(
      { userId },
      { $pull: { permissionSetIds: setId } }
    );

    await resolvePermissions(userId);

    auditLog(req, {
      action: 'update',
      resourceType: 'User',
      resourceId: userId,
      resourceLabel: user.name,
      metadata: { permissionSetRemoved: setId },
    });

    res.status(200).json({ success: true, message: 'Permission set removed and permissions recalculated' });
  } catch (err) { next(err); }
};

// GET /api/privileges/users/:userId/history
export const getOverrideHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ _id: userId, companyId: req.user.companyId }).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const history = await AuditLog.find({
      companyId: req.user.companyId,
      resourceId: userId,
      action: { $in: ['permission_grant', 'permission_deny', 'role_change', 'deactivate', 'activate', 'create'] },
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.status(200).json({ success: true, data: history });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// SECTION D — ACCESS MAP & AUDIT LOGS
// ═══════════════════════════════════════════════════════════════

// GET /api/privileges/access-map
// ?permission=invoice.view → who has this permission
// No param → full map of all users + permissions
export const getAccessMap = async (req, res, next) => {
  try {
    const { permission } = req.query;

    const filter = { companyId: req.user.companyId };
    if (permission) {
      filter.effectivePermissions = permission;
    }

    const userPerms = await UserPermission.find(filter)
      .populate('userId', 'name email role isActive')
      .lean();

    const map = userPerms.map(up => ({
      userId:               up.userId?._id,
      userName:             up.userId?.name,
      userEmail:            up.userId?.email,
      role:                 up.userId?.role,
      isActive:             up.userId?.isActive,
      effectivePermissions: up.effectivePermissions,
      overrides:            up.overrides,
    }));

    res.status(200).json({ success: true, data: map, total: map.length });
  } catch (err) { next(err); }
};

// GET /api/privileges/access-logs — business audit log (AuditLog)
export const getAccessLogs = async (req, res, next) => {
  try {
    const { actorId, action, resourceType, from, to, page = 1, limit = 50 } = req.query;

    const filter = { companyId: req.user.companyId };
    if (actorId)       filter.actorId = actorId;
    if (action)        filter.action = action;
    if (resourceType)  filter.resourceType = resourceType;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) { next(err); }
};

// GET /api/privileges/access-logs/export — CSV export of AuditLog (business events)
export const exportAuditLogs = async (req, res, next) => {
  try {
    const { actorId, action, resourceType, from, to } = req.query;

    const filter = { companyId: req.user.companyId };
    if (actorId)       filter.actorId = actorId;
    if (action)        filter.action = action;
    if (resourceType)  filter.resourceType = resourceType;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }

    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(5000).lean();

    const header = 'Date,Actor,Role,Action,Resource Type,Resource Label,Changes,IP\n';
    const rows = logs.map(l => {
      const changes = l.changes ? JSON.stringify(l.changes).replace(/"/g, '""') : '';
      return [
        new Date(l.createdAt).toISOString(),
        `"${l.actorName || ''}"`,
        `"${l.actorRole || ''}"`,
        l.action,
        l.resourceType || '',
        `"${l.resourceLabel || ''}"`,
        `"${changes}"`,
        l.ip || '',
      ].join(',');
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-log.csv"');
    res.send(header + rows.join('\n'));
  } catch (err) { next(err); }
};

// GET /api/privileges/permission-logs/export — CSV export of AccessLog (permission check events)
export const exportPermissionLogs = async (req, res, next) => {
  try {
    const { userId, result, from, to } = req.query;

    const filter = { companyId: req.user.companyId };
    if (userId) filter.userId = userId;
    if (result) filter.result = result;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to)   filter.timestamp.$lte = new Date(to);
    }

    const logs = await AccessLog.find(filter).sort({ timestamp: -1 }).limit(5000).lean();

    const header = 'Date,User ID,Permission,Resource,Result,IP\n';
    const rows = logs.map(l => [
      new Date(l.timestamp).toISOString(),
      l.userId?.toString() || '',
      l.permission || '',
      `"${l.resource || ''}"`,
      l.result || '',
      l.ip || '',
    ].join(','));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="permission-log.csv"');
    res.send(header + rows.join('\n'));
  } catch (err) { next(err); }
};
