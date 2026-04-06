/**
 * Migration: Add project_designer role to live database
 * Run once: node utils/add_project_designer_role.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

import { Role } from '../models/Role.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Upsert project_designer role
  const pdRole = await Role.findOneAndUpdate(
    { name: 'project_designer', companyId: null },
    {
      companyId: null,
      name: 'project_designer',
      isSystem: true,
      permissions: [
        'quotation.view',
        'project.view',
        'jobcard.view',
        'client.view',
      ],
      dataScope: 'own',
      isActive: true,
    },
    { upsert: true, new: true }
  );
  console.log(`✅ project_designer role created/updated: ${pdRole._id}`);

  // Upsert architect role (if missing)
  const archRole = await Role.findOneAndUpdate(
    { name: 'architect', companyId: null },
    {
      companyId: null,
      name: 'architect',
      isSystem: true,
      permissions: [
        'quotation.view',
        'project.view',
        'jobcard.view',
        'client.view',
      ],
      dataScope: 'own',
      isActive: true,
    },
    { upsert: true, new: true }
  );
  console.log(`✅ architect role created/updated: ${archRole._id}`);

  await mongoose.disconnect();
  console.log('🎉 Migration complete!');
};

run().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
