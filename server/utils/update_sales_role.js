import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

import { Role } from '../models/Role.js';
import { UserPermission } from '../models/UserPermission.js';

const updateSalesRole = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Update the Role definition
    const salesRole = await Role.findOne({ name: 'sales' });
    if (!salesRole) {
      console.log('❌ Sales role not found');
    } else {
      const newPermissions = salesRole.permissions.filter(p => p !== 'invoice.view');
      salesRole.permissions = newPermissions;
      await salesRole.save();
      console.log('✅ Sales Role permissions updated (removed invoice.view)');
    }

    // 2. Update UserPermission instances for sales role
    const result = await UserPermission.updateMany(
      { role: 'sales' },
      { $pull: { effectivePermissions: 'invoice.view' } }
    );
    console.log(`✅ Updated ${result.modifiedCount} UserPermission records`);

    console.log('\n🎉 Targeted update complete!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Update failed:', err);
    process.exit(1);
  }
};

updateSalesRole();
