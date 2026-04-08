/**
 * Update Roles Script
 * Adds 'user.view' permission to 'sales' and 'accountant' roles in the database.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

import { Role } from '../models/Role.js';
import { UserPermission } from '../models/UserPermission.js';

const updateRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const rolesToUpdate = ['sales', 'accountant'];
    
    for (const roleName of rolesToUpdate) {
      const role = await Role.findOne({ name: roleName });
      if (role) {
        if (!role.permissions.includes('user.view')) {
          role.permissions.push('user.view');
          await role.save();
          console.log(`✅ Updated permissions for role: ${roleName}`);
          
          // Update all existing UserPermissions for this role
          const result = await UserPermission.updateMany(
            { role: roleName },
            { $addToSet: { effectivePermissions: 'user.view' } }
          );
          console.log(`   ↳ Updated ${result.modifiedCount} UserPermission records.`);
        } else {
          console.log(`ℹ️ Role ${roleName} already has 'user.view' permission.`);
        }
      } else {
        console.log(`⚠️ Role ${roleName} not found.`);
      }
    }

    console.log('\n🎉 Update complete!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Update failed:', err);
    process.exit(1);
  }
};

updateRoles();
