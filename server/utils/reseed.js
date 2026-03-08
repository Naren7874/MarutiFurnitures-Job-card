/**
 * Clean Re-Seed Script — drops ALL existing data then re-seeds fresh
 * Usage: node utils/reseed.js
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

// ── Company Definitions ──────────────────────────────────────────────────────

const COMPANIES = [
  {
    name: 'Maruti Furniture',
    slug: 'maruti-furniture',
    tagline: 'Crafting Excellence',
    phone: '9876543210',
    email: 'info@marutifurniture.com',
    address: { city: 'Ahmedabad', state: 'Gujarat', pincode: '380001' },
    quotationPrefix: 'MF',
    jobCardPrefix: 'MF',
    invoicePrefix: 'MF',
    projectPrefix: 'MF',
    gstRates: { cgst: 9, sgst: 9, igst: 18 },
    gstin: '24AAAAA0000A1Z5',
    plan: 'premium',
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
    name: 'Brand Two Furniture',
    slug: 'brand-two',
    tagline: 'Modern Living Solutions',
    phone: '9876543211',
    email: 'info@brandtwo.com',
    address: { city: 'Ahmedabad', state: 'Gujarat', pincode: '380059' },
    quotationPrefix: 'BT',
    jobCardPrefix: 'BT',
    invoicePrefix: 'BT',
    projectPrefix: 'BT',
    gstRates: { cgst: 9, sgst: 9, igst: 18 },
    gstin: '24BBBBB0000B1Z5',
    plan: 'standard',
    defaultTermsAndConditions: [
      '50% advance payment required before production begins.',
      'Balance payment due on delivery.',
    ],
    isActive: true,
  },
];

// ── System Role Definitions ──────────────────────────────────────────────────

const buildRoles = (companyId) => [
  { companyId, name: 'super_admin', isSystem: true, permissions: ['*.*'], dataScope: 'all', isActive: true },
  {
    companyId, name: 'sales', isSystem: true, dataScope: 'own', isActive: true,
    permissions: ['client.view','client.create','client.edit','quotation.view','quotation.create','quotation.edit','quotation.send','project.view','jobcard.view','invoice.view','gst.verify','notification.view'],
  },
  {
    companyId, name: 'design', isSystem: true, dataScope: 'department', isActive: true,
    permissions: ['jobcard.view','designrequest.view','designrequest.create','designrequest.edit','designrequest.upload','designrequest.signoff','designrequest.ready','project.view','notification.view'],
  },
  {
    companyId, name: 'store', isSystem: true, dataScope: 'department', isActive: true,
    // store sees Design tab read-only (needs measurements to build BOM)
    permissions: ['jobcard.view','storeStage.view','storeStage.edit','storeStage.issue','inventory.view','inventory.create','inventory.edit','purchaseOrder.view','purchaseOrder.create','purchaseOrder.edit','designrequest.view','notification.view'],
  },
  {
    companyId, name: 'production', isSystem: true, dataScope: 'department', isActive: true,
    // production sees Design (measurements) + Store (issued materials) read-only + QC result read-only
    permissions: ['jobcard.view','productionStage.view','productionStage.edit','designrequest.view','storeStage.view','qcStage.view','notification.view'],
  },
  {
    companyId, name: 'qc', isSystem: true, dataScope: 'department', isActive: true,
    // qc sees Design (specs to verify) + Production (substage history) read-only
    permissions: ['jobcard.view','qcStage.view','qcStage.edit','qcStage.pass','qcStage.fail','designrequest.view','productionStage.view','notification.view'],
  },
  {
    companyId, name: 'dispatch', isSystem: true, dataScope: 'department', isActive: true,
    // dispatch sees QC tab read-only (QC cert PDF to carry on delivery)
    permissions: ['jobcard.view','dispatchStage.view','dispatchStage.edit','dispatchStage.deliver','qcStage.view','notification.view'],
  },
  {
    companyId, name: 'accountant', isSystem: true, dataScope: 'all', isActive: true,
    permissions: ['invoice.view','invoice.create','invoice.edit','invoice.payment','quotation.view','client.view','project.view','jobcard.view','purchaseOrder.view','report.view','notification.view'],
  },
  {
    companyId, name: 'client', isSystem: true, dataScope: 'own', isActive: true,
    permissions: ['quotation.view','project.view','invoice.view','designrequest.signoff'],
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────

const reseed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // ── Clean ALL existing seed data ─────────────────────────────────────────
  console.log('🗑  Dropping existing data...');
  await Promise.all([
    Company.deleteMany({}),
    User.deleteMany({}),
    Role.deleteMany({}),
    UserPermission.deleteMany({}),
  ]);
  console.log('✅ Cleared: Companies, Users, Roles, UserPermissions');

  // ── Create companies ─────────────────────────────────────────────────────
  const createdCompanies = [];
  for (const companyData of COMPANIES) {
    const company = await Company.create(companyData);
    createdCompanies.push(company);
    console.log(`✅ Company: ${company.name} (${company._id})`);

    const roles = buildRoles(company._id);
    const created = await Role.insertMany(roles);
    console.log(`   ↳ ${created.length} roles created`);
  }

  // ── Super Admin (belongs to company 1, can switch to any) ────────────────
  const primaryCompany = createdCompanies[0];
  const superAdminRole = await Role.findOne({ companyId: primaryCompany._id, name: 'super_admin' });

  const superAdmin = await User.create({
    companyId:    primaryCompany._id,
    name:         'Super Admin',
    email:        'admin@maruti.com',
    password:     'Admin@1234',
    phone:        '9876543210',
    role:         'super_admin',
    department:   'management',
    isSuperAdmin: true,
    isActive:     true,
  });
  console.log(`✅ Super Admin: ${superAdmin.email} (password: Admin@1234)`);

  await UserPermission.create({
    companyId:            primaryCompany._id,
    userId:               superAdmin._id,
    roleId:               superAdminRole._id,
    permissionSetIds:     [],
    overrides:            [],
    effectivePermissions: ['*.*'],
  });
  console.log(`   ↳ UserPermission created for super admin`);
  console.log(`   ↳ Super admin can switch to any company via the dashboard toggles`);


  console.log('\n🎉 Reseed complete!');
  console.log('─────────────────────────────────────');
  console.log('Login: admin@maruti.com / Admin@1234');
  console.log('Companies:');
  for (const c of createdCompanies) {
    console.log(`  • ${c.name}  (${c._id})`);
  }
  console.log('─────────────────────────────────────');

  await mongoose.disconnect();
  process.exit(0);
};

reseed().catch((err) => {
  console.error('❌ Reseed failed:', err);
  process.exit(1);
});
