import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

import { Role } from '../models/Role.js';
import { UserPermission } from '../models/UserPermission.js';

const restrictSalesFinancials = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const permissionsToRemove = [
      'reports.view_financial',
      'reports.export',
      'invoice.view',
      'invoice.create',
      'invoice.edit',
      'invoice.delete',
      'invoice.payment',
      'invoice.archive'
    ];

    // 1. Update the Role definition (Global)
    const salesRole = await Role.findOne({ name: 'sales' });
    if (!salesRole) {
      console.log('❌ Sales role not found in Role collection');
    } else {
      const originalCount = salesRole.permissions.length;
      salesRole.permissions = salesRole.permissions.filter(p => !permissionsToRemove.includes(p));
      await salesRole.save();
      console.log(`✅ Sales Role permissions updated. Removed ${originalCount - salesRole.permissions.length} restricted permissions.`);
    }

    // 2. Update UserPermission instances for sales role (Per company/user)
    const result = await UserPermission.updateMany(
      { role: 'sales' },
      { $pull: { effectivePermissions: { $in: permissionsToRemove } } }
    );
    console.log(`✅ Updated ${result.modifiedCount} UserPermission records (pulled restricted permissions)`);

    console.log('\n🎉 Financial restriction for Sales role complete!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
};

restrictSalesFinancials();
