import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import { Role } from './models/Role.js';
import { UserPermission } from './models/UserPermission.js';
import Company from './models/Company.js';
import { resolvePermissions } from './utils/resolvePermissions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // 1. Get all roles and de-duplicate by name
        const allRoles = await Role.find({}).lean();
        const roleMap = {}; // name -> masterRoleDoc
        
        console.log(`Found ${allRoles.length} raw role records.`);

        for (const r of allRoles) {
            if (!roleMap[r.name]) {
                // First time we see this role name, make it the "Master"
                // But prefer a role that is already global or from a main company if possible
                roleMap[r.name] = r;
            } else {
                // We already have a master, but if this one has more permissions, maybe merge?
                // For simplicity, we just keep the first one found.
            }
        }

        // 2. Converge to Global Roles (companyId: null)
        const globalRoleIds = {}; // name -> newGlobalRoleId
        for (const name in roleMap) {
            const master = roleMap[name];
            
            // Check if a global role already exists with this name (no companyId)
            let globalRole = await Role.findOne({ name, companyId: null });
            
            if (!globalRole) {
                // Convert the master to global
                globalRole = await Role.findByIdAndUpdate(master._id, 
                    { companyId: null, isSystem: master.isSystem || false }, 
                    { new: true }
                );
                console.log(`   🌟 Created Global Role: ${name}`);
            } else {
                console.log(`   ✅ Global Role already exists: ${name}`);
            }
            globalRoleIds[name] = globalRole._id;
        }

        // 3. Cleanup: Delete roles that are not global
        const delRes = await Role.deleteMany({ companyId: { $ne: null } });
        console.log(`   🗑️ Deleted ${delRes.deletedCount} redundant company-specific roles.`);

        // 4. Update all UserPermissions to use global Role IDs
        const users = await User.find({}).lean();
        const companies = await Company.find({ isActive: true }).lean();
        
        console.log(`Processing sync for ${users.length} users across ${companies.length} companies...`);

        for (const user of users) {
             console.log(`User: ${user.email}`);
             const roleName = user.role || 'sales';
             const masterRoleId = globalRoleIds[roleName] || globalRoleIds['sales'];

             if (!masterRoleId) {
                 console.warn(`   ⚠️ No master role found for ${roleName}. skipping.`);
                 continue;
             }

             for (const comp of companies) {
                 const existingPerm = await UserPermission.findOne({ userId: user._id, companyId: comp._id });
                 
                 if (!existingPerm) {
                     await UserPermission.create({
                         userId: user._id,
                         companyId: comp._id,
                         role: roleName,
                         roleId: masterRoleId,
                         effectivePermissions: user.isSuperAdmin ? ['*.*'] : [], // resolvePermissions will fix
                     });
                     console.log(`   ➕ Created permission for ${comp.name}`);
                 } else {
                     await UserPermission.updateOne(
                         { _id: existingPerm._id },
                         { $set: { role: roleName, roleId: masterRoleId } }
                     );
                     console.log(`   🔄 Updated permission for ${comp.name}`);
                 }
                 
                 // Rebuild cache
                 await resolvePermissions(user._id, comp._id).catch(() => {});
             }
        }

        console.log('Global Migration Complete!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
