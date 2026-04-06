import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

import { Role } from '../models/Role.js';
import { UserPermission } from '../models/UserPermission.js';

const restrictSalesActions = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const permissionsToRemove = [
      // Financial / Reports
      'reports.view_financial',
      'reports.export',
      
      // Invoices (Restrict but allow view and RECORD payment)
      'invoice.edit',
      'invoice.delete',
      'invoice.archive',
      
      // Delete Operations (Critical for Sales restriction)
      'quotation.delete',
      'jobcard.delete',
      'client.delete',
      'project.delete'
    ];

    const permissionsToAdd = [
      'invoice.view',
      'invoice.payment',
      'invoice.create' // Sales often needs to create invoices from Job Cards
    ];

    // 1. Update the Role definition (Global)
    const salesRole = await Role.findOne({ name: 'sales' });
    if (!salesRole) {
      console.log('❌ Sales role not found in Role collection');
    } else {
      // Remove restricted
      salesRole.permissions = salesRole.permissions.filter(p => !permissionsToRemove.includes(p));
      // Add required if missing
      permissionsToAdd.forEach(p => {
        if (!salesRole.permissions.includes(p)) salesRole.permissions.push(p);
      });
      await salesRole.save();
      console.log(`✅ Sales Role permissions updated (Global).`);
    }

    // 2. Update UserPermission instances for sales role (Per company/user)
    // First Pull restricted
    await UserPermission.updateMany(
      { role: 'sales' },
      { $pull: { effectivePermissions: { $in: permissionsToRemove } } }
    );
    // Then Add required
    const result = await UserPermission.updateMany(
      { role: 'sales' },
      { $addToSet: { effectivePermissions: { $each: permissionsToAdd } } }
    );
    console.log(`✅ Updated ${result.modifiedCount} UserPermission records (Sync complete)`);

    console.log('\n🎉 Comprehensive restriction for Sales role complete!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
};

restrictSalesActions();
