/**
 * Revert Furnituno Script — Restore Furnituno to its original state (from seed.js)
 * Usage: node utils/revertFurnituno.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

import Company from '../models/Company.js';
import { Role } from '../models/Role.js';

const FURNITUNO_DATA = {
  name: 'Furnituno',
  slug: 'furnituno',
  logo: '/Furnituno Logo_New.svg',
  tagline: 'Discover a World of Luxury',
  gstin: '24AAKFF5517B1ZT',
  address: { 
    line1: 'Plot No.7/D, Anand Audhyogik Vasahat',
    line2: 'Borsad Chowkdi, Jitodia',
    city: 'Anand', 
    state: 'Gujarat', 
    pincode: '388001' 
  },
  phone: '+91 94090 40767',
  email: 'info@furnituno.com',
  bankDetails: {
    bankName: 'IDFC FIRST BANK',
    accountName: 'FURNITUNO',
    branch: 'Anand Branch, Amul Dairy Road',
    accountNumber: '50000026764',
    ifsc: 'IDFB0040352'
  },
  quotationPrefix: 'FT',
  jobCardPrefix: 'FT',
  invoicePrefix: 'FT',
  projectPrefix: 'FT',
  gstRates: { cgst: 9, sgst: 9, igst: 18 },
  defaultTermsAndConditions: [
    '50% advance payment required before production begins.',
    'Balance payment due on delivery.',
  ],
  isActive: true,
};

const buildRoles = (companyId) => [
  { companyId, name: 'super_admin', isSystem: true, permissions: ['*.*'], dataScope: 'all', isActive: true },
  { companyId, name: 'sales', isSystem: true, permissions: ['client.view', 'client.create', 'client.edit', 'quotation.view', 'quotation.create', 'quotation.edit', 'quotation.send', 'project.view', 'jobcard.view', 'invoice.view', 'gst.verify', 'notification.view'], dataScope: 'own', isActive: true },
  { companyId, name: 'design', isSystem: true, permissions: ['jobcard.view', 'designrequest.view', 'designrequest.create', 'designrequest.edit', 'designrequest.upload', 'project.view', 'notification.view'], dataScope: 'department', isActive: true },
  { companyId, name: 'store', isSystem: true, permissions: ['jobcard.view', 'storeStage.view', 'storeStage.edit', 'storeStage.issue', 'inventory.view', 'inventory.create', 'inventory.edit', 'purchaseOrder.view', 'purchaseOrder.create', 'purchaseOrder.edit', 'notification.view'], dataScope: 'department', isActive: true },
  { companyId, name: 'production', isSystem: true, permissions: ['jobcard.view', 'productionStage.view', 'productionStage.edit', 'notification.view'], dataScope: 'department', isActive: true },
  { companyId, name: 'qc', isSystem: true, permissions: ['jobcard.view', 'qcStage.view', 'qcStage.edit', 'qcStage.pass', 'qcStage.fail', 'notification.view'], dataScope: 'department', isActive: true },
  { companyId, name: 'dispatch', isSystem: true, permissions: ['jobcard.view', 'dispatchStage.view', 'dispatchStage.edit', 'dispatchStage.deliver', 'notification.view'], dataScope: 'department', isActive: true },
  { companyId, name: 'accountant', isSystem: true, permissions: ['invoice.view', 'invoice.create', 'invoice.edit', 'invoice.payment', 'quotation.view', 'client.view', 'project.view', 'jobcard.view', 'purchaseOrder.view', 'report.view', 'notification.view'], dataScope: 'all', isActive: true },
  { companyId, name: 'client', isSystem: true, permissions: ['quotation.view', 'project.view', 'invoice.view', 'designrequest.signoff'], dataScope: 'own', isActive: true },
];

const revert = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const furnituno = await Company.findOne({ slug: 'furnituno' });
    if (!furnituno) {
      console.error('❌ Furnituno company not found.');
      process.exit(1);
    }

    console.log(`🔄 Reverting Furnituno (${furnituno._id}) to original metadata...`);
    await Company.findByIdAndUpdate(furnituno._id, FURNITUNO_DATA);

    console.log('🗑️  Removing incorrectly cloned roles for Furnituno...');
    await Role.deleteMany({ companyId: furnituno._id });

    console.log('✨ Recreating original system roles for Furnituno...');
    const roles = buildRoles(furnituno._id);
    await Role.insertMany(roles);

    console.log('✅ Furnituno has been restored to its original state!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Revert failed:', err);
    process.exit(1);
  }
};

revert();
