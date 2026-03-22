/**
 * Custom Seed Script — Clone Maruti Furniture to Furnituno and Test
 * Seeds high-quality sample data with Indian names for the Test company.
 * Usage: node utils/customSeed.js
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
import Client from '../models/Client.js';
import { Inventory } from '../models/Inventory.js';
import Quotation from '../models/Quotation.js';
import Project from '../models/Project.js';
import JobCard from '../models/JobCard.js';
import DesignRequest from '../models/DesignRequest.js';
import { Counter } from '../models/Counter.js';

// ── Shared Utils ───────────────────────────────────────────────────────────
const ahead = (days) => new Date(Date.now() + days * 86400000);
const ago = (days) => new Date(Date.now() - days * 86400000);

const INDIAN_NAMES = {
  sales:      { first: 'Rajesh', last: 'Sharma' },
  design:     { first: 'Priya',  last: 'Patel' },
  store:      { first: 'Amit',   last: 'Verma' },
  production: { first: 'Vikram', last: 'Singh' },
  qc:         { first: 'Neha',   last: 'Gupta' },
  dispatch:   { first: 'Rahul',  last: 'Mehta' },
  accountant: { first: 'Suresh', last: 'Iyer' }
};

const CLIENTS_SEED = [
  { name: 'Anjali Desai', firmName: 'Desai Architecture', phone: '9820012345', clientType: 'architect', email: 'anjali@desai.in', address: { city: 'Mumbai', state: 'Maharashtra' } },
  { name: 'Rohan Malhotra', firmName: 'Malhotra Residences', phone: '9821054321', clientType: 'direct_client', email: 'rohan@malhotra.com', address: { city: 'Pune', state: 'Maharashtra' } },
  { name: 'Kavita Reddy', firmName: 'Reddy Design Studio', phone: '9890011223', clientType: 'project_designer', email: 'kavita@reddy.in', address: { city: 'Bangalore', state: 'Karnataka' } },
  { name: 'Sanjay Nair', firmName: 'Nair Associates', phone: '9769009988', clientType: 'architect', email: 'sanjay@nair.com', address: { city: 'Chennai', state: 'Tamil Nadu' } },
  { name: 'Deepika Joshi', firmName: 'Joshi Interiors', phone: '9920033445', clientType: 'project_designer', email: 'deepika@joshi.in', address: { city: 'Ahmedabad', state: 'Gujarat' } }
];

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Find Maruti Furniture
    const maruti = await Company.findOne({ slug: 'maruti-furniture' });
    if (!maruti) {
      console.error('❌ Maruti Furniture company not found. Please run seed.js first.');
      process.exit(1);
    }
    console.log(`✅ Found Maruti Furniture (${maruti._id})`);

    // 2. Clone to Furnituno
    let furnituno = await Company.findOne({ slug: 'furnituno' });
    if (furnituno) {
      console.log('🔄 Updating Furnituno metadata from Maruti...');
      const meta = maruti.toObject();
      delete meta._id;
      delete meta.name;
      delete meta.slug;
      delete meta.createdAt;
      delete meta.updatedAt;
      await Company.findByIdAndUpdate(furnituno._id, { ...meta, name: 'Furnituno', slug: 'furnituno' });
    } else {
      console.log('✨ Creating Furnituno from Maruti template...');
      const meta = maruti.toObject();
      delete meta._id;
      delete meta.createdAt;
      delete meta.updatedAt;
      furnituno = await Company.create({ ...meta, name: 'Furnituno', slug: 'furnituno' });
    }

    // Clone roles to Furnituno
    const marutiRoles = await Role.find({ companyId: maruti._id });
    for (const r of marutiRoles) {
      const roleData = r.toObject();
      delete roleData._id;
      delete roleData.createdAt;
      delete roleData.updatedAt;
      await Role.updateOne(
        { companyId: furnituno._id, name: r.name },
        { ...roleData, companyId: furnituno._id },
        { upsert: true }
      );
    }
    console.log('✅ Furnituno roles synchronized');

    // 3. Create/Update Test Company
    let testCompany = await Company.findOne({ slug: 'test' });
    if (testCompany) {
      console.log('🔄 Updating Test company metadata from Maruti...');
      const meta = maruti.toObject();
      delete meta._id;
      delete meta.name;
      delete meta.slug;
      delete meta.createdAt;
      delete meta.updatedAt;
      await Company.findByIdAndUpdate(testCompany._id, { ...meta, name: 'Test Company', slug: 'test' });
    } else {
      console.log('✨ Creating Test company from Maruti template...');
      const meta = maruti.toObject();
      delete meta._id;
      delete meta.createdAt;
      delete meta.updatedAt;
      testCompany = await Company.create({ ...meta, name: 'Test Company', slug: 'test' });
    }

    // Clone roles to Test
    for (const r of marutiRoles) {
      const roleData = r.toObject();
      delete roleData._id;
      delete roleData.createdAt;
      delete roleData.updatedAt;
      await Role.updateOne(
        { companyId: testCompany._id, name: r.name },
        { ...roleData, companyId: testCompany._id },
        { upsert: true }
      );
    }
    console.log('✅ Test company roles synchronized');

    // 4. Seed Test Company with Data
    console.log('🌱 Seeding sample data for Test Company...');
    const CID = testCompany._id;

    // Clear old sample data for Test
    await Promise.all([
      Client.deleteMany({ companyId: CID }), 
      Inventory.deleteMany({ companyId: CID }),
      Quotation.deleteMany({ companyId: CID }), 
      Project.deleteMany({ companyId: CID }),
      JobCard.deleteMany({ companyId: CID }), 
      DesignRequest.deleteMany({ companyId: CID }),
      User.deleteMany({ companyId: CID, isSuperAdmin: { $ne: true } }),
      UserPermission.deleteMany({ companyId: CID, userId: { $exists: true } }),
      Counter.deleteMany({ _id: new RegExp(`^${CID}_`) })
    ]);

    // Create Staff with Indian Names
    const staff = {};
    for (const [key, name] of Object.entries(INDIAN_NAMES)) {
      const email = `${key}@test.com`;
      const u = await User.create({
        companyId: CID,
        firstName: name.firstName || name.first,
        lastName:  name.lastName  || name.last,
        email,
        password:  'Staff@1234',
        role:      key,
        department: key === 'accountant' ? 'accounts' : key,
        isActive:  true
      });
      staff[key] = u;
      const roleDoc = await Role.findOne({ companyId: CID, name: key });
      if (roleDoc) {
        await UserPermission.create({
          companyId: CID,
          userId: u._id,
          roleId: roleDoc._id,
          permissionSetIds: [],
          overrides: [],
          effectivePermissions: roleDoc.permissions
        });
      }
    }

    // Create Clients
    const createdClients = [];
    for (const c of CLIENTS_SEED) {
      createdClients.push(await Client.create({ ...c, companyId: CID, createdBy: staff.sales._id }));
    }

    // Create Sample Inventory
    await Inventory.insertMany([
      { companyId: CID, itemName: 'Teak Wood Plank', category: 'board', unit: 'sqft', currentStock: 200, minStock: 20, pricePerUnit: 1500 },
      { companyId: CID, itemName: 'SS Handle 6"', category: 'hardware', unit: 'pcs', currentStock: 100, minStock: 10, pricePerUnit: 250 },
      { companyId: CID, itemName: 'Grey Laminate 1mm', category: 'board', unit: 'sheets', currentStock: 50, minStock: 5, pricePerUnit: 2200 }
    ]);

    // Create Quotations and JobCards
    const PROJECT_NAMES = ['Modern Living Room (Sample)', 'Master Bedroom Suite (Sample)', 'Office Cabin Interior (Sample)', 'Kitchen Remodel (Sample)'];
    const STATUSES     = ['active', 'in_production', 'qc_pending', 'qc_passed'];

    for (let i = 0; i < PROJECT_NAMES.length; i++) {
        const client = createdClients[i % createdClients.length];
        const q = await Quotation.create({
            companyId: CID,
            quotationNumber: `TST-QT-${1000 + i}`,
            clientId: client._id,
            projectName: PROJECT_NAMES[i],
            items: [{ srNo: 1, category: 'Furniture', description: `Custom ${PROJECT_NAMES[i]} items`, qty: 1, unit: 'pcs', mrp: 50000, sellingPrice: 45000 }],
            status: 'converted',
            handledBy: staff.sales._id,
            createdBy: staff.sales._id
        });

        const p = await Project.create({
            companyId: CID,
            projectNumber: `TST-PRJ-${1000 + i}`,
            clientId: client._id,
            quotationId: q._id,
            projectName: q.projectName,
            status: 'active',
            priority: 'medium',
            expectedDelivery: ahead(30),
            createdBy: staff.sales._id
        });

        await JobCard.create({
            companyId: CID,
            jobCardNumber: `TST-JC-${1000 + i}`,
            projectId: p._id,
            clientId: client._id,
            quotationId: q._id,
            title: q.projectName,
            items: q.items,
            salesperson: { id: staff.sales._id, name: staff.sales.name },
            status: STATUSES[i],
            priority: 'medium',
            orderDate: ago(3),
            createdBy: staff.sales._id
        });
    }

    // Initialize Counters
    await Promise.all([
      Counter.updateOne({ _id: `${CID}_quotation` }, { $set: { seq: 1004 } }, { upsert: true }),
      Counter.updateOne({ _id: `${CID}_project` },   { $set: { seq: 1004 } }, { upsert: true }),
      Counter.updateOne({ _id: `${CID}_jobcard` },   { $set: { seq: 1004 } }, { upsert: true })
    ]);

    console.log('✅ Seeding complete for Test Company!');
    console.log('─────────────────────────────────────');
    console.log('Credentials (Test Company):');
    console.log('  Sales:     sales@test.com / Staff@1234');
    console.log('  Design:    design@test.com / Staff@1234');
    console.log('  Production: production@test.com / Staff@1234');
    console.log('─────────────────────────────────────');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Script failed:', err);
    process.exit(1);
  }
};

seedData();
