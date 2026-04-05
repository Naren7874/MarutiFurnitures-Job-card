import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Role } from '../models/Role.js';
import { UserPermission } from '../models/UserPermission.js';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const NEW_PERMISSIONS = [
  'client.view', 'client.create', 'client.edit',
  'quotation.view', 'quotation.create', 'quotation.edit', 'quotation.send', 'quotation.approve', 'quotation.delete',
  'project.view', 'project.create', 'project.edit', 'project.delete',
  'jobcard.view', 'jobcard.create', 'jobcard.edit', 'jobcard.assign', 'jobcard.delete',
  'productionStage.view', 'productionStage.edit',
  'qcStage.view', 'qcStage.edit', 'qcStage.pass', 'qcStage.fail',
  'dispatchStage.view', 'dispatchStage.edit', 'dispatchStage.deliver',
  'invoice.view', 'invoice.create', 'invoice.edit', 'invoice.delete', 'invoice.payment',
  'report.view', 'reports.view_financial', 'reports.view_production', 'reports.export',
  'gst.verify',
  'notification.view',
];

async function updateSalesRole() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Update the 'sales' Role definition
    const salesRole = await Role.findOneAndUpdate(
      { name: 'sales', companyId: null },
      { permissions: NEW_PERMISSIONS, dataScope: 'all' },
      { new: true }
    );

    if (!salesRole) {
      console.error('Sales role not found');
      return;
    }
    console.log('Updated global sales role definition');

    // 2. Update all UserPermission entries that use the 'sales' role
    const result = await UserPermission.updateMany(
      { role: 'sales' },
      { 
        effectivePermissions: NEW_PERMISSIONS,
        dataScope: 'all' 
      }
    );

    console.log(`Updated ${result.modifiedCount} user permissions for sales users`);
    
    await mongoose.disconnect();
    console.log('Done');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateSalesRole();
