import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import Company from '../models/Company.js';
import User from '../models/User.js';
import { Role } from '../models/Role.js';
import { UserPermission } from '../models/UserPermission.js';

async function fixAdmins() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const companies = await Company.find({ isActive: true });
  for (const company of companies) {
    const adminExists = await User.findOne({ companyId: company._id, isSuperAdmin: true });
    if (!adminExists) {
      console.log(`Creating Super Admin for ${company.name}`);
      const superAdminRole = await Role.findOne({ companyId: company._id, name: 'super_admin' });
      if (!superAdminRole) {
        console.error(`No super_admin role for ${company.name}`);
        continue;
      }

      const email = company.slug === 'maruti-furniture' ? 'admin@maruti.com' : 'admin@furnituno.com';
      const user = await User.create({
        companyId: company._id,
        name: 'Super Admin',
        email: email,
        password: 'Admin@1234',
        phone: '9876543210',
        role: 'super_admin',
        department: 'management',
        isSuperAdmin: true,
        isActive: true,
      });

      await UserPermission.create({
        companyId: company._id,
        userId: user._id,
        roleId: superAdminRole._id,
        permissionSetIds: [],
        overrides: [],
        effectivePermissions: ['*.*'],
      });
      console.log(`   ✅ Created ${email}`);
    } else {
      console.log(`Super Admin already exists for ${company.name}`);
    }
  }
  await mongoose.disconnect();
  console.log('Done.');
}

fixAdmins().catch(err => {
  console.error(err);
  process.exit(1);
});
