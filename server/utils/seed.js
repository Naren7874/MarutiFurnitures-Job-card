/**
 * Seed Script — run once to bootstrap the system
 * Creates: Both companies, super admin user, 9 system roles per company, default T&C
 *
 * Usage: node utils/seed.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

import Company from '../models/Company.js';
import User from '../models/User.js';
import { Role } from '../models/Role.js';
import { UserPermission } from '../models/UserPermission.js';

// ── Company Definitions ─────────────────────────────────────────────────────

const COMPANIES = [
  {
    name: 'Maruti Furniture',
    slug: 'maruti-furniture',
    logo: '/Maruti icon_New.svg',
    tagline: 'The Solid Wood Furniture Makers',
    gstin: '24ABLFM2535N1ZY',
    address: { 
      line1: '"V.M." HOUSE, OPP-HOMEOPATHIC COLLAGE',
      line2: 'NEW BUS STAND, ROAD',
      city: 'Anand', 
      state: 'Gujarat', 
      pincode: '388001' 
    },
    phone: '+91 72260 06767',
    email: 'info@marutifurniture.com',
    bankDetails: {
      bankName: 'HDFC BANK',
      accountName: 'MARUTI FURNITURE',
      branch: 'SANKET 2, LAMBHVEL ROAD, ANAND',
      accountNumber: '50200039164993',
      ifsc: 'HDFC0000183'
    },
    quotationPrefix: 'MF',
    jobCardPrefix: 'MF',
    invoicePrefix: 'MF',
    projectPrefix: 'MF',
    gstRates: { cgst: 9, sgst: 9, igst: 18 },
    defaultTermsAndConditions: [
      '50% advance payment required before production begins.',
      'Balance payment due on delivery.',
      'Delivery timeline starts from material confirmation.',
      'Warranty: 1 year on manufacturing defects.',
      'Custom orders are non-refundable.',
    ],
    isActive: true,
  },
  {
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
  },
];

// ── System Role Definitions ─────────────────────────────────────────────────

const buildRoles = (companyId) => [
  {
    companyId,
    name: 'super_admin',
    isSystem: true,
    permissions: ['*.*'],  // Wildcard — all permissions
    dataScope: 'all',
    isActive: true,
  },
  {
    companyId,
    name: 'sales',
    isSystem: true,
    permissions: [
      'client.view', 'client.create', 'client.edit',
      'quotation.view', 'quotation.create', 'quotation.edit', 'quotation.send',
      'project.view',
      'jobcard.view',
      'invoice.view',
      'gst.verify',
      'notification.view',
    ],
    dataScope: 'own',
    isActive: true,
  },
  {
    companyId,
    name: 'design',
    isSystem: true,
    permissions: [
      'jobcard.view',
      'designrequest.view', 'designrequest.create', 'designrequest.edit',
      'designrequest.upload',
      'project.view',
      'notification.view',
    ],
    dataScope: 'department',
    isActive: true,
  },
  {
    companyId,
    name: 'store',
    isSystem: true,
    permissions: [
      'jobcard.view',
      'storeStage.view', 'storeStage.edit', 'storeStage.issue',
      'inventory.view', 'inventory.create', 'inventory.edit',
      'purchaseOrder.view', 'purchaseOrder.create', 'purchaseOrder.edit',
      'notification.view',
    ],
    dataScope: 'department',
    isActive: true,
  },
  {
    companyId,
    name: 'production',
    isSystem: true,
    permissions: [
      'jobcard.view',
      'productionStage.view', 'productionStage.edit',
      'notification.view',
    ],
    dataScope: 'department',
    isActive: true,
  },
  {
    companyId,
    name: 'qc',
    isSystem: true,
    permissions: [
      'jobcard.view',
      'qcStage.view', 'qcStage.edit', 'qcStage.pass', 'qcStage.fail',
      'notification.view',
    ],
    dataScope: 'department',
    isActive: true,
  },
  {
    companyId,
    name: 'dispatch',
    isSystem: true,
    permissions: [
      'jobcard.view',
      'dispatchStage.view', 'dispatchStage.edit', 'dispatchStage.deliver',
      'notification.view',
    ],
    dataScope: 'department',
    isActive: true,
  },
  {
    companyId,
    name: 'accountant',
    isSystem: true,
    permissions: [
      'invoice.view', 'invoice.create', 'invoice.edit', 'invoice.payment',
      'quotation.view',
      'client.view',
      'project.view',
      'jobcard.view',
      'purchaseOrder.view',
      'report.view',
      'notification.view',
    ],
    dataScope: 'all',
    isActive: true,
  },
  {
    companyId,
    name: 'client',
    isSystem: true,
    permissions: [
      'quotation.view',
      'project.view',
      'invoice.view',
      'designrequest.signoff',
    ],
    dataScope: 'own',
    isActive: true,
  },
];

// ── Seed Function ───────────────────────────────────────────────────────────

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Clear existing base data for a clean seed
  console.log('🧹 Cleaning existing collections...');
  await Company.deleteMany({});
  await Role.deleteMany({});
  await User.deleteMany({});
  await UserPermission.deleteMany({});
  console.log('✅ Collections cleared');

  const createdCompanies = [];

  for (const companyData of COMPANIES) {
    const company = await Company.create(companyData);
    createdCompanies.push(company);
    console.log(`✅ Company created: ${company.name} (${company._id})`);

    // Create system roles for this company
    const roles = buildRoles(company._id);
    const createdRoles = await Role.insertMany(roles);
    console.log(`   ↳ ${createdRoles.length} system roles created`);
  }

  // ── Super Admin User (cross-company) ─────────────────────────────────────

  const primaryCompany = createdCompanies[0];
  const superAdminRole = await Role.findOne({ companyId: primaryCompany._id, name: 'super_admin' });

  const superAdmin = await User.create({
    companyId:   primaryCompany._id,
    name:        'Super Admin',
    email:       'admin@maruti.com',
    password:    'Admin@1234',           // Will be hashed by pre-save hook
    phone:       '9876543210',
    role:        'super_admin',
    department:  'management',
    isSuperAdmin: true,
    isActive:    true,
  });
  console.log(`✅ Super Admin created: ${superAdmin.email}`);

  // Create UserPermission record for super admin
  await UserPermission.create({
    companyId:            primaryCompany._id,
    userId:               superAdmin._id,
    roleId:               superAdminRole._id,
    permissionSetIds:     [],
    overrides:            [],
    effectivePermissions: ['*.*'],
  });
  console.log(`   ↳ UserPermission record created for super admin`);

  console.log('\n🎉 Seed complete!');
  console.log('─────────────────────────────────────');
  console.log('Credentials:');
  console.log('  Email:    admin@maruti.com');
  console.log('  Password: Admin@1234');
  console.log('─────────────────────────────────────');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
