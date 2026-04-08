import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

import { Role } from '../models/Role.js';
import { UserPermission } from '../models/UserPermission.js';
import User from '../models/User.js';

const fixDuplicateRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const allRoles = await Role.find({});
    console.log(`📋 Found ${allRoles.length} total roles in DB.`);
    const rolesByName = {};
    const normalize = (n) => n.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Group roles by normalized name
    allRoles.forEach(role => {
      console.log(`   - role: "${role.name}" [isSystem: ${role.isSystem}]`);
      let normName = normalize(role.name);
      
      // Specifically treat "architecture" and "architect" as the same group
      if (normName === 'architecture' || normName === 'architect') {
        normName = 'architect_group';
      }

      if (!rolesByName[normName]) {
        rolesByName[normName] = [];
      }
      rolesByName[normName].push(role);
    });

    for (const [name, roles] of Object.entries(rolesByName)) {
      if (roles.length > 1) {
        console.log(`\n🔍 Found duplicates for "${name}":`);
        
        // Decide which one to keep
        // Priority: 1. System roles, 2. Oldest created
        roles.sort((a, b) => {
          if (a.isSystem && !b.isSystem) return -1;
          if (!a.isSystem && b.isSystem) return 1;
          return a.createdAt - b.createdAt;
        });

        const keepRole = roles[0];
        const discardRoles = roles.slice(1);

        console.log(`   KEEP:    ${keepRole.name} (${keepRole._id}) [System: ${keepRole.isSystem}]`);
        
        for (const discardRole of discardRoles) {
          console.log(`   DISCARD: ${discardRole.name} (${discardRole._id}) [System: ${discardRole.isSystem}]`);

          if (discardRole.isSystem && keepRole.isSystem) {
            console.warn(`   ⚠️ Both are system roles! Skipping merge for ${discardRole.name}. Manual intervention may be needed.`);
            continue;
          }

          // 1. Reassign UserPermission records
          const updateResult = await UserPermission.updateMany(
            { roleId: discardRole._id },
            { $set: { roleId: keepRole._id, role: keepRole.name } }
          );
          console.log(`   ✅ Reassigned ${updateResult.modifiedCount} user permission records.`);

          // 2. Update User model (if it stores role name string)
          const userUpdateResult = await User.updateMany(
            { role: discardRole.name },
            { $set: { role: keepRole.name } }
          );
          console.log(`   ✅ Updated ${userUpdateResult.modifiedCount} user records.`);

          // 3. Delete discard role
          await Role.deleteOne({ _id: discardRole._id });
          console.log(`   ✅ Deleted duplicate role "${discardRole.name}".`);
        }
      }
    }

    console.log('\n🎉 Cleanup complete!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Cleanup failed:', err);
    process.exit(1);
  }
};

fixDuplicateRoles();
