import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { Role } from '../models/Role.js';
import { UserPermission } from '../models/UserPermission.js';
import { resolvePermissions } from '../utils/resolvePermissions.js';
import { auditLog } from '../utils/auditLogger.js';

// ── GET /api/users ────────────────────────────────────────────────────────────
// List all users in the same company (company-scoped)
export const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, role, isActive, search } = req.query;

    const filter = { companyId: req.user.companyId };
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -resetPasswordToken -resetPasswordExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/users/:id ────────────────────────────────────────────────────────
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    })
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .lean();

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/users ───────────────────────────────────────────────────────────
// Create a new user — admin only
export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department, phone, whatsappNumber } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'name, email, password, and role are required',
      });
    }

    // Check for duplicate email within the company
    const existing = await User.findOne({
      email: email.toLowerCase().trim(),
      companyId: req.user.companyId,
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists in your company',
      });
    }

    const newUser = await User.create({
      companyId: req.user.companyId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,                               // pre-save hook hashes it
      role,
      department: department || undefined,
      phone: phone || undefined,
      whatsappNumber: whatsappNumber || undefined,
      createdBy: req.user.userId,
    });

    // ── Bug 2 fix: auto-create UserPermission record so the user has permissions immediately
    // Look up the Role document matching the role string (e.g. 'sales' → Role {name:'sales', isSystem:true})
    const roleDoc = await Role.findOne({ companyId: req.user.companyId, name: role }).lean();
    if (roleDoc) {
      try {
        await UserPermission.create({
          companyId: req.user.companyId,
          userId: newUser._id,
          roleId: roleDoc._id,
          permissionSetIds: [],
          overrides: [],
          effectivePermissions: roleDoc.permissions || [],
        });
        // Update user's roleId reference
        await User.findByIdAndUpdate(newUser._id, { roleId: roleDoc._id });
        // Rebuild and cache effective permissions
        resolvePermissions(newUser._id.toString()).catch(() => { });
      } catch (permErr) {
        // Don't fail user creation if permission record fails — log and continue
        console.error('[createUser] Failed to create UserPermission:', permErr.message);
      }
    }

    const userObj = newUser.toObject();
    delete userObj.password;
    delete userObj.resetPasswordToken;
    delete userObj.resetPasswordExpires;

    auditLog(req, {
      action: 'create',
      resourceType: 'User',
      resourceId: newUser._id,
      resourceLabel: newUser.name,
      changes: { email: { from: null, to: newUser.email }, role: { from: null, to: newUser.role } },
    });

    res.status(201).json({ success: true, data: userObj, message: 'User created successfully' });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/users/:id ────────────────────────────────────────────────────────
// Update user details — admin can update any company user; user can update self
export const updateUser = async (req, res, next) => {
  try {
    const { name, role, department, phone, whatsappNumber, isActive } = req.body;

    const user = await User.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Only super_admin can change role/active status
    if ((role !== undefined || isActive !== undefined) &&
      req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only admins can change role or status' });
    }

    if (name !== undefined) user.name = name.trim();
    if (role !== undefined) user.role = role;
    if (department !== undefined) user.department = department;
    if (phone !== undefined) user.phone = phone;
    if (whatsappNumber !== undefined) user.whatsappNumber = whatsappNumber;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.resetPasswordToken;
    delete userObj.resetPasswordExpires;

    auditLog(req, {
      action: 'update',
      resourceType: 'User',
      resourceId: user._id,
      resourceLabel: user.name,
      changes: {
        ...(name !== undefined && { name: { from: undefined, to: name } }),
        ...(role !== undefined && { role: { from: undefined, to: role } }),
        ...(department !== undefined && { department: { from: undefined, to: department } }),
        ...(isActive !== undefined && { isActive: { from: undefined, to: isActive } }),
      },
    });

    res.status(200).json({ success: true, data: userObj, message: 'User updated successfully' });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/users/:id (soft-delete → deactivate) ─────────────────────────
export const deleteUser = async (req, res, next) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.user.userId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate yourself' });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    auditLog(req, {
      action: 'deactivate',
      resourceType: 'User',
      resourceId: user._id,
      resourceLabel: user.name,
    });

    res.status(200).json({ success: true, message: 'User deactivated successfully' });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/users/:id/reset-password ───────────────────────────────────────
// Admin-initiated password reset (sets a new password directly)
export const resetUserPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    const user = await User.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password = newPassword; // pre-save hook hashes it
    await user.save();

    auditLog(req, {
      action: 'password_reset',
      resourceType: 'User',
      resourceId: user._id,
      resourceLabel: user.name,
    });

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/users/:id/role ─────────────────────────────────────────────────
export const changeUserRole = async (req, res, next) => {
  try {
    // Accept either a role name string (e.g. 'sales') or a custom role ObjectId string (roleId)
    const { role, roleId } = req.body;
    if (!role && !roleId) return res.status(400).json({ success: false, message: 'Role or roleId is required' });

    // Find the target Role document — by roleId if provided, otherwise by name
    let roleDoc = null;
    if (roleId) {
      roleDoc = await Role.findOne({ _id: roleId, companyId: req.user.companyId }).lean();
    } else {
      roleDoc = await Role.findOne({ companyId: req.user.companyId, name: role }).lean();
    }

    if (!roleDoc) {
      return res.status(404).json({ success: false, message: `Role "${role || roleId}" not found. Check that the role exists in this company.` });
    }

    const oldUser = await User.findOne({ _id: req.params.id, companyId: req.user.companyId }).lean();
    if (!oldUser) return res.status(404).json({ success: false, message: 'User not found' });

    // Update User document: role name + roleId reference
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: roleDoc.name, roleId: roleDoc._id },
      { new: true }
    ).select('-password');

    // ── Bug 3 fix: update UserPermission.roleId and rebuild effective permissions
    await UserPermission.findOneAndUpdate(
      { userId: req.params.id },
      { roleId: roleDoc._id },
      { upsert: true, new: true }
    );
    // Rebuild and cache effective permissions asynchronously
    resolvePermissions(req.params.id).catch(() => { });

    auditLog(req, {
      action: 'role_change',
      resourceType: 'User',
      resourceId: user._id,
      resourceLabel: user.name,
      changes: { role: { from: oldUser.role, to: roleDoc.name } },
    });

    res.status(200).json({ success: true, data: user, message: 'Role updated' });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/users/:id/deactivate ──────────────────────────────────────────
export const deactivateUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.userId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate yourself' });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    auditLog(req, {
      action: 'deactivate',
      resourceType: 'User',
      resourceId: user._id,
      resourceLabel: user.name,
    });

    res.status(200).json({ success: true, message: 'User deactivated' });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/users/:id/activate ────────────────────────────────────────────
export const activateUser = async (req, res, next) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      { isActive: true },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    auditLog(req, {
      action: 'activate',
      resourceType: 'User',
      resourceId: user._id,
      resourceLabel: user.name,
    });

    res.status(200).json({ success: true, message: 'User activated' });
  } catch (err) {
    next(err);
  }
};
