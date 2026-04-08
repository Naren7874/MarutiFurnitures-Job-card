import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

import { Role } from '../models/Role.js';
import { UserPermission } from '../models/UserPermission.js';

const fixFMPermissions = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // From our audit, the exact name is "Factory Manager"
    const rolesToUpdate = ['Factory Manager', 'factory_manager', 'factorymanager'];
    const permissionsToAdd = ['qcStage.view', 'productionStage.view', 'productionStage.edit'];
    
    for (const roleName of rolesToUpdate) {
      const role = await Role.findOne({ name: roleName });
      if (role) {
        console.log(`🔍 Found role: "${roleName}"`);
        let changed = false;
        permissionsToAdd.forEach(p => {
          if (!role.permissions.includes(p)) {
            role.permissions.push(p);
            changed = true;
          }
        });

        if (changed) {
          await role.save();
          console.log(`   ✅ Updated permissions in Role table.`);
        } else {
          console.log(`   ℹ️ Role already had all permissions.`);
        }

        // Update all existing UserPermissions for this role
        // We match by the 'role' field which might be normalized or not
        const result = await UserPermission.updateMany(
          { role: roleName },
          { $addToSet: { effectivePermissions: { $each: permissionsToAdd } } }
        );
        console.log(`   ↳ Updated ${result.modifiedCount} UserPermission records for "${roleName}".`);
      }
    }

    // Also check for any UserPermission records that might have a different case
    const resultInsensitive = await UserPermission.updateMany(
      { role: { $regex: /^factory[ _]?manager$/i } },
      { $addToSet: { effectivePermissions: { $each: permissionsToAdd } } }
    );
    console.log(`\n✅ Regex catch-all updated ${resultInsensitive.modifiedCount} additional UserPermission records.`);

    console.log('\n🎉 Permission fix complete!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Fix failed:', err);
    process.exit(1);
  }
};

fixFMPermissions();
