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

        const users = await User.find({}).lean();
        const companies = await Company.find({}).lean();

        console.log(`Found ${users.length} users and ${companies.length} companies.`);

        for (const user of users) {
            console.log(`Processing User: ${user.email} (${user.name})`);

            for (const company of companies) {
                // Check if permission already exists
                let perm = await UserPermission.findOne({ userId: user._id, companyId: company._id });

                if (!perm) {
                    // 1. Find a suitable role in this company
                    let roleName = user.isSuperAdmin ? 'super_admin' : (user.role || 'sales');
                    let roleDoc = await Role.findOne({ companyId: company._id, name: roleName }).lean();

                    // 2. Fallback to any system role if name doesn't match
                    if (!roleDoc) {
                        roleDoc = await Role.findOne({ companyId: company._id, isSystem: true, name: roleName }).lean() 
                               || await Role.findOne({ companyId: company._id, isSystem: true, name: 'sales' }).lean()
                               || await Role.findOne({ companyId: company._id, isSystem: true }).lean();
                    }

                    if (!roleDoc) {
                        console.warn(`   ⚠️ No role found for ${user.email} in ${company.name}. Skipping.`);
                        continue;
                    }

                    // 3. Create UserPermission
                    perm = await UserPermission.create({
                        userId: user._id,
                        companyId: company._id,
                        role: roleDoc.name,
                        roleId: roleDoc._id,
                        effectivePermissions: user.isSuperAdmin ? ['*.*'] : (roleDoc.permissions || [])
                    });
                    console.log(`   ✅ Linked to ${company.name} as ${perm.role}`);
                }
 else {
                    console.log(`   ℹ️ Already exists in ${company.name}`);
                }

                // 4. Force rebuild permissions cache
                await resolvePermissions(user._id, company._id).catch(() => {});
            }
        }

        console.log('Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
