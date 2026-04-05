import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Role } from '../models/Role.js';
import { UserPermission } from '../models/UserPermission.js';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const PERMISSIONS_TO_REMOVE = [
  'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
  'purchaseOrder.view', 'purchaseOrder.create', 'purchaseOrder.edit', 'purchaseOrder.delete',
  'storeStage.view', 'storeStage.edit', 'storeStage.issue'
];

async function cleanupInventory() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Remove 'store' role
    const deletedRole = await Role.deleteOne({ name: 'store', companyId: null });
    console.log(`Deleted global store role: ${deletedRole.deletedCount}`);

    // 2. Prune permissions from ALL roles (Global and Company-specific)
    const roles = await Role.find({});
    let rolesPruned = 0;
    for (const role of roles) {
      if (role.permissions.includes('*.*')) continue;
      
      const newPermissions = role.permissions.filter(p => !PERMISSIONS_TO_REMOVE.includes(p));
      if (newPermissions.length !== role.permissions.length) {
        await Role.updateOne({ _id: role._id }, { $set: { permissions: newPermissions } });
        rolesPruned++;
      }
    }
    console.log(`Pruned permissions for ${rolesPruned} roles`);

    // 3. Prune effectivePermissions from UserPermission entries
    const userPerms = await UserPermission.find({});
    let usersPruned = 0;
    for (const up of userPerms) {
      if (up.effectivePermissions.includes('*.*')) continue;

      const newEP = up.effectivePermissions.filter(p => !PERMISSIONS_TO_REMOVE.includes(p));
      if (newEP.length !== up.effectivePermissions.length) {
        await UserPermission.updateOne({ _id: up._id }, { $set: { effectivePermissions: newEP } });
        usersPruned++;
      }
    }
    console.log(`Pruned effectivePermissions for ${usersPruned} user permission entries`);

    await mongoose.disconnect();
    console.log('Cleanup Complete');
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupInventory();
