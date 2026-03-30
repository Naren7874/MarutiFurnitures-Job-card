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
        console.log('✅ Connected to DB');

        // ── STEP 1: Deduplicate roles by name ────────────────────────────────
        const allRoles = await Role.find({}).lean();
        console.log(`Found ${allRoles.length} raw role records.`);

        // Build a map: role name → master doc (prefer already-global roles)
        const roleMap = {};
        for (const r of allRoles) {
            if (!roleMap[r.name]) {
                roleMap[r.name] = r;
            } else if (!r.companyId) {
                // Prefer the global role (companyId: null) as master
                roleMap[r.name] = r;
            }
        }

        // ── STEP 2: Converge to Global Roles (companyId: null) ───────────────
        const globalRoleIds = {}; // name → _id of the global role
        for (const name in roleMap) {
            const master = roleMap[name];

            let globalRole = await Role.findOne({ name, companyId: null });

            if (!globalRole) {
                // Promote master to global
                globalRole = await Role.findByIdAndUpdate(
                    master._id,
                    { $unset: { companyId: 1 }, $set: { isSystem: master.isSystem || false } },
                    { new: true }
                );
                console.log(`   🌟 Promoted to global: ${name}`);
            } else {
                console.log(`   ✅ Already global: ${name}`);
            }
            globalRoleIds[name] = globalRole._id;
        }

        // ── STEP 3: Delete all company-specific (non-global) roles ───────────
        const delRes = await Role.deleteMany({ companyId: { $ne: null } });
        console.log(`   🗑️  Deleted ${delRes.deletedCount} company-specific roles.`);

        // ── STEP 4: Point all UserPermissions to correct global roleIds ───────
        console.log('Updating UserPermission records to use global role IDs...');
        for (const [roleName, globalRoleId] of Object.entries(globalRoleIds)) {
            const result = await UserPermission.updateMany(
                { role: roleName },
                { $set: { roleId: globalRoleId } }
            );
            console.log(`   🔄 Updated ${result.modifiedCount} UserPermissions for role: ${roleName}`);
        }

        // ── STEP 5: Ensure every user has a UserPermission for every company ──
        const users = await User.find({}).lean();
        const companies = await Company.find({ isActive: true }).lean();

        console.log(`\nSyncing ${users.length} users across ${companies.length} companies...`);

        for (const user of users) {
            const roleName = user.role;
            if (!roleName) {
                console.warn(`   ⚠️  User ${user.email} has no role — skipping.`);
                continue;
            }

            const globalRoleId = globalRoleIds[roleName];
            if (!globalRoleId) {
                console.warn(`   ⚠️  No global role found for "${roleName}" (user: ${user.email}) — skipping.`);
                continue;
            }

            for (const comp of companies) {
                const exists = await UserPermission.findOne({
                    userId: user._id,
                    companyId: comp._id,
                }).lean();

                if (!exists) {
                    await UserPermission.create({
                        userId:               user._id,
                        companyId:            comp._id,
                        role:                 roleName,
                        roleId:               globalRoleId,
                        effectivePermissions: user.isSuperAdmin ? ['*.*'] : [],
                    });
                    console.log(`   ➕ Created UserPermission: ${user.email} → ${comp.name}`);
                }

                // Rebuild effective permissions cache
                await resolvePermissions(
                    user._id.toString(),
                    comp._id.toString()
                ).catch(err => console.warn(`   ⚠️  resolvePermissions failed for ${user.email}: ${err.message}`));
            }
        }

        console.log('\n✅ Global Migration Complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
