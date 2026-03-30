import mongoose from 'mongoose';
import User from '../models/User.js';
import { Role } from '../models/Role.js';
import { UserPermission } from '../models/UserPermission.js';
import { resolvePermissions } from '../utils/resolvePermissions.js';
import { auditLog } from '../utils/auditLogger.js';
import { sendWelcomeEmail } from '../utils/emailService.js';

// ── GET /api/users ────────────────────────────────────────────────────────────
// List all users in the current company context (via UserPermission)
export const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, role, isActive, search } = req.query;

    // Query UserPermissions for this company
    const query = { companyId: req.user.companyId };
    if (role) query.role = role;

    const skip = (Number(page) - 1) * Number(limit);

    // Build match for User population
    const userMatch = {};
    if (isActive !== undefined) userMatch.isActive = isActive === 'true';
    if (search) {
      userMatch.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [permissions, total] = await Promise.all([
      UserPermission.find(query)
        .populate({
          path: 'userId',
          select: '-password -resetPasswordToken -resetPasswordExpires',
          match: Object.keys(userMatch).length ? userMatch : undefined,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      UserPermission.countDocuments(query),
    ]);

    // Flatten for frontend
    const users = permissions
      .filter(p => p.userId)
      .map(p => ({
        ...p.userId,
        permissionId: p._id,
        role: p.role,
        department: p.department,
        companyId: p.companyId,
        roleId: p.roleId,
      }));

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
    const permission = await UserPermission.findOne({
      userId: req.params.id,
      companyId: req.user.companyId,
    }).populate('userId').lean();

    if (!permission) return res.status(404).json({ success: false, message: 'User not found in this company' });

    const user = {
      ...permission.userId,
      role: permission.role,
      department: permission.department,
      roleId: permission.roleId,
    };
    delete user.password;

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/users ───────────────────────────────────────────────────────────
// Create a new global user and provision them across ALL companies
export const createUser = async (req, res, next) => {
  try {
    const {
      firstName, middleName, lastName,
      email, password, role, department, phone, whatsappNumber,
      firmName, factoryName, factoryLocation
    } = req.body;

    if (!firstName || !lastName || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'firstName, lastName, email, and role are required',
      });
    }

    // Generate password: FirstName + last 4 digits of phone (fallback '1234')
    const phoneSuffix = phone ? phone.trim().replace(/\s+/g, '').slice(-4) : '1234';
    const generatedPassword = password || `${firstName.trim()}${phoneSuffix}`;

    // Check global user existence
    let user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user) {
      // User exists globally — check if already in this company
      const existingPerm = await UserPermission.findOne({
        userId: user._id,
        companyId: req.user.companyId,
      });
      if (existingPerm) {
        return res.status(400).json({
          success: false,
          message: 'This user is already part of your company staff.',
        });
      }
    }

    // Role lookup — global (no companyId filter)
    const roleDoc = await Role.findOne({ name: role }).lean();
    if (!roleDoc) {
      return res.status(404).json({ success: false, message: `Role "${role}" not found.` });
    }

    if (!user) {
      // Create new global User
      user = await User.create({
        firstName: firstName.trim(),
        middleName: middleName?.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        password: generatedPassword,
        role,
        department,
        phone: phone || undefined,
        whatsappNumber: whatsappNumber || undefined,
        firmName: firmName || undefined,
        factoryName: factoryName || undefined,
        factoryLocation: factoryLocation || undefined,
        companyId: req.user.companyId,
        createdBy: req.user.userId,
      });
    }

    // Provision UserPermission across ALL active companies
    const Company = mongoose.model('Company');
    const companies = await Company.find({ isActive: true }).lean();

    const permPromises = companies.map(comp =>
      UserPermission.findOneAndUpdate(
        { userId: user._id, companyId: comp._id },
        {
          roleId: roleDoc._id,
          role: roleDoc.name,
          department: department || undefined,
          effectivePermissions: user.isSuperAdmin ? ['*.*'] : (roleDoc.permissions || []),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    );
    await Promise.all(permPromises);

    // Warm permissions cache for current company
    resolvePermissions(user._id.toString(), req.user.companyId.toString()).catch(() => { });

    const userPayload = {
      ...user.toObject(),
      role: roleDoc.name,
      department: department || undefined,
      companyId: req.user.companyId,
    };
    delete userPayload.password;
    delete userPayload.resetPasswordToken;
    delete userPayload.resetPasswordExpires;

    auditLog(req, {
      action: 'create',
      resourceType: 'User',
      resourceId: user._id,
      resourceLabel: user.name,
      metadata: { role: roleDoc.name },
    });

    res.status(201).json({
      success: true,
      data: userPayload,
      message: 'User created and synced to all companies.',
    });

    // Send welcome email async (after response)
    sendWelcomeEmail({
      email: user.email,
      firstName: user.firstName,
      password: generatedPassword,
      role: roleDoc.name,
    }).catch(err => console.error('[createUser] Email send failed:', err));
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/users/:id ────────────────────────────────────────────────────────
export const updateUser = async (req, res, next) => {
  try {
    const {
      firstName, middleName, lastName,
      role, department, phone, whatsappNumber, isActive,
      firmName, factoryName, factoryLocation
    } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Verify user is in this company
    const permission = await UserPermission.findOne({
      userId: req.params.id,
      companyId: req.user.companyId,
    });
    if (!permission) return res.status(404).json({ success: false, message: 'User is not part of this company' });

    // Only super_admin can change role/active status
    if ((role !== undefined || isActive !== undefined) && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only admins can change role or status' });
    }

    // Global fields (User model)
    if (firstName !== undefined) user.firstName = firstName.trim();
    if (middleName !== undefined) user.middleName = middleName.trim();
    if (lastName !== undefined) user.lastName = lastName.trim();
    if (phone !== undefined) user.phone = phone;
    if (whatsappNumber !== undefined) user.whatsappNumber = whatsappNumber;
    if (isActive !== undefined) user.isActive = isActive;
    if (firmName !== undefined) user.firmName = firmName;
    if (factoryName !== undefined) user.factoryName = factoryName;
    if (factoryLocation !== undefined) user.factoryLocation = factoryLocation;

    await user.save();

    // Update role across ALL companies if changed
    if (role !== undefined) {
      const roleDoc = await Role.findOne({ name: role }).lean();
      if (roleDoc) {
        await UserPermission.updateMany(
          { userId: req.params.id },
          {
            role: roleDoc.name,
            roleId: roleDoc._id,
            effectivePermissions: user.isSuperAdmin ? ['*.*'] : (roleDoc.permissions || [])
          }
        );
      }
    }
    if (department !== undefined) {
      await UserPermission.updateMany(
        { userId: req.params.id },
        { department }
      );
    }

    resolvePermissions(user._id.toString(), req.user.companyId.toString()).catch(() => { });

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.resetPasswordToken;
    delete userObj.resetPasswordExpires;

    auditLog(req, {
      action: 'update',
      resourceType: 'User',
      resourceId: user._id,
      resourceLabel: user.name,
    });

    res.status(200).json({ success: true, data: userObj, message: 'User updated successfully' });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/users/:id ─────────────────────────────────────────────────────
// Global delete — removes from ALL companies and deletes the User document
export const deleteUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;

    if (targetUserId === req.user.userId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete yourself' });
    }

    const user = await User.findById(targetUserId).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.role === 'super_admin') {
      return res.status(403).json({ success: false, message: 'Super admin users cannot be deleted' });
    }

    // Remove ALL UserPermission records across every company
    await UserPermission.deleteMany({ userId: targetUserId });

    // Delete the global User document
    await User.deleteOne({ _id: targetUserId });

    auditLog(req, {
      action: 'delete',
      resourceType: 'User',
      resourceId: targetUserId,
      resourceLabel: user.name || 'User Deleted',
    });

    res.status(200).json({ success: true, message: 'User permanently deleted from all companies.' });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/users/:id/reset-password ───────────────────────────────────────
export const resetUserPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    // Global user lookup — no companyId filter
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Ensure they belong to the caller's company
    const perm = await UserPermission.findOne({ userId: user._id, companyId: req.user.companyId }).lean();
    if (!perm) return res.status(403).json({ success: false, message: 'User is not part of your company' });

    user.password = newPassword;
    await user.save();

    auditLog(req, { action: 'password_reset', resourceType: 'User', resourceId: user._id, resourceLabel: user.name });

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/users/:id/role ─────────────────────────────────────────────────
export const changeUserRole = async (req, res, next) => {
  try {
    const { role, roleId } = req.body;
    if (!role && !roleId) return res.status(400).json({ success: false, message: 'Role or roleId is required' });

    // Global role lookup
    let roleDoc = null;
    if (roleId) {
      roleDoc = await Role.findById(roleId).lean();
    } else {
      roleDoc = await Role.findOne({ name: role }).lean();
    }

    if (!roleDoc) {
      return res.status(404).json({ success: false, message: `Role "${role || roleId}" not found.` });
    }

    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Update across ALL companies
    await UserPermission.updateMany(
      { userId: req.params.id },
      {
        role: roleDoc.name,
        roleId: roleDoc._id,
        effectivePermissions: user.isSuperAdmin ? ['*.*'] : (roleDoc.permissions || [])
      }
    );

    // Rebuild permissions cache for all companies
    const Company = mongoose.model('Company');
    const companies = await Company.find({ isActive: true }).lean();
    for (const comp of companies) {
      resolvePermissions(req.params.id, comp._id.toString()).catch(() => { });
    }

    auditLog(req, {
      action: 'role_change',
      resourceType: 'User',
      resourceId: user._id,
      resourceLabel: user.name,
      metadata: { role: roleDoc.name },
    });

    res.status(200).json({ success: true, message: 'Role updated globally across all companies.' });
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

    // Global update — isActive is on User model, not per-company
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    auditLog(req, { action: 'deactivate', resourceType: 'User', resourceId: user._id, resourceLabel: user.name });

    res.status(200).json({ success: true, message: 'User deactivated' });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/users/:id/activate ────────────────────────────────────────────
export const activateUser = async (req, res, next) => {
  try {
    // Global update
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    auditLog(req, { action: 'activate', resourceType: 'User', resourceId: user._id, resourceLabel: user.name });

    res.status(200).json({ success: true, message: 'User activated' });
  } catch (err) {
    next(err);
  }
};
