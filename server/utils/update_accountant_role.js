import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

import { Role } from '../models/Role.js';
import { UserPermission } from '../models/UserPermission.js';

const updateAccountantRole = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const accountantPermissions = [
      // Operational (Borrowed from Sales base)
      'client.view', 'client.create', 'client.edit', 'client.verify_gst',
      'quotation.view', 'quotation.create', 'quotation.edit', 'quotation.send',
      'project.view', 'project.create', 'project.edit',
      'jobcard.view', 'jobcard.create', 'jobcard.edit', 'jobcard.assign',
      'designrequest.view', 'designrequest.create', 'designrequest.edit', 'designrequest.upload',
      'notification.view',

      // Financial & Administrative (Exclusive to Accountant/Admin)
      'invoice.view', 
      'invoice.create', 
      'invoice.edit', 
      'invoice.delete', 
      'invoice.payment', // Covers create, update, and delete payment records
      'invoice.archive',
      'reports.view_financial', 
      'reports.view_production', 
      'reports.view_delivery', 
      'reports.export',
      'gst.verify',
      'whatsapp.send_manual'
    ];

    // 1. Update the Role definition (Global)
    const accountantRole = await Role.findOne({ name: 'accountant' });
    if (!accountantRole) {
      console.log('❌ Accountant role not found in Role collection');
    } else {
      accountantRole.permissions = accountantPermissions;
      await accountantRole.save();
      console.log(`✅ Accountant Role permissions updated (Global).`);
    }

    // 2. Update UserPermission instances for accountant role (Per company/user)
    const result = await UserPermission.updateMany(
      { role: 'accountant' },
      { $set: { effectivePermissions: accountantPermissions } }
    );
    console.log(`✅ Updated ${result.modifiedCount} UserPermission records (Sync complete)`);

    console.log('\n🎉 Accountant role correction complete!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
};

updateAccountantRole();
