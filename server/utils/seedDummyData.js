/**
 * Seed Dummy Data — High-Quality Multi-Tenant version (Asymmetrical)
 * Maruti Furniture: 5 Records (Luxury Residential)
 * Furnituno: 9 Records (Modern Corporate)
 * Usage: node utils/seedDummyData.js
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
import { StoreStage } from '../models/StoreStage.js';
import { ProductionStage } from '../models/ProductionStage.js';
import { QcStage } from '../models/QcStage.js';
import { DispatchStage } from '../models/DispatchStage.js';
import { Invoice } from '../models/Invoice.js';
import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { Counter } from '../models/Counter.js';

const ago = (days) => new Date(Date.now() - days * 86400000);
const ahead = (days) => new Date(Date.now() + days * 86400000);

const datasets = {
  'maruti-furniture': {
    clients: [
      { name: 'Sameer Rajput', firmName: 'Oberoi Sky Residences', phone: '9000012345', clientType: 'direct_client', email: 'sameer@oberoi.com', address: { line1: 'Flat 402, Building A', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' } },
      { name: 'Ar. Anjali Gupta', firmName: 'Design Studio 9', phone: '9000067890', clientType: 'architect', gstin: '27AABC1234M1Z5', email: 'anjali@ds9.in', address: { line1: 'Studio 11, Art District', city: 'Ahmedabad', state: 'Gujarat', pincode: '380015' } },
      { name: 'Vikram Sethi', firmName: 'The Landmark Tower', phone: '9111122233', clientType: 'direct_client', email: 'vikram@land-mark.in', address: { line1: 'Penthouse 1, Terrace Block', city: 'Surat', state: 'Gujarat', pincode: '395007' } },
      { name: 'Meera Deshmukh', firmName: 'Vintage Homes', phone: '9222233344', clientType: 'project_designer', email: 'meera@vintage.com', address: { line1: 'Bunglow 45, Green Park', city: 'Anand', state: 'Gujarat', pincode: '388001' } },
      { name: 'Rahul Bajaj', firmName: 'Bajaj Estate', phone: '9333344455', clientType: 'direct_client', email: 'rahul@bajaj.in', address: { line1: 'Sector 4, Main Road', city: 'Ahmedabad', state: 'Gujarat', pincode: '380013' } }
    ],
    inventory: [
      { itemName: 'Burma Teak Wood', category: 'board', unit: 'sqft', currentStock: 500, minStock: 50, pricePerUnit: 1200, supplier: 'Burma Woods' },
      { itemName: 'Gold Foil Sheet (24k)', category: 'hardware', unit: 'pcs', currentStock: 200, minStock: 20, pricePerUnit: 450, supplier: 'Lux Decor' },
      { itemName: 'Italian Velvet (Royal Blue)', category: 'fabric', unit: 'mtr', currentStock: 150, minStock: 30, pricePerUnit: 1800, supplier: 'Milan Fabrics' },
      { itemName: 'Artisan Crystal Handles', category: 'hardware', unit: 'pcs', currentStock: 45, minStock: 10, pricePerUnit: 3200, supplier: 'Crystal Arts' }
    ],
    quotations: [
      { projectName: 'Maharaja Lounge Set', items: [{ srNo: 1, category: 'Furniture', description: 'Hand-carved Teak Sofa', qty: 1, unit: 'pcs', mrp: 250000, sellingPrice: 225000 }], status: 'converted' },
      { projectName: 'Gold-leafed Dining Table', items: [{ srNo: 1, category: 'Furniture', description: '8-seater Gold Inlay Table', qty: 1, unit: 'pcs', mrp: 180000, sellingPrice: 165000 }], status: 'converted' },
      { projectName: 'Master Bedroom Wardrobe', items: [{ srNo: 1, category: 'Furniture', description: 'Velvet-padded Sliding Wardrobe', qty: 2, unit: 'pcs', mrp: 95000, sellingPrice: 88000 }], status: 'converted' },
      { projectName: 'Antique Sideboard', items: [{ srNo: 1, category: 'Furniture', description: 'Vintage finished Teak Chest', qty: 1, unit: 'pcs', mrp: 45000, sellingPrice: 42000 }], status: 'sent' },
      { projectName: 'Luxury Swings (Jhula)', items: [{ srNo: 1, category: 'Furniture', description: 'Pure Teak Traditional Jhula', qty: 1, unit: 'pcs', mrp: 75000, sellingPrice: 70000 }], status: 'draft' }
    ]
  },
  'furnituno': {
    clients: [
      { name: 'Karan Mehra', firmName: 'TechVeda HQ', phone: '8000012345', clientType: 'direct_client', gstin: '24BBCC5678Q1Z1', email: 'admin@techveda.io', address: { line1: '7th Floor, Innovation Park', city: 'Bangalore', state: 'Karnataka', pincode: '560001' } },
      { name: 'Radhika Iyer', firmName: 'Flow Co-working', phone: '8000054321', clientType: 'direct_client', gstin: '24XCCV9876R1Z9', email: 'ops@flow.com', address: { line1: 'Block C, Ground Floor', city: 'Ahmedabad', state: 'Gujarat', pincode: '382421' } },
      { name: 'Sanjay Gupta', firmName: 'FinSync Solutions', phone: '8111122233', clientType: 'direct_client', gstin: '24AAAVV1111S1Z2', email: 'hr@finsync.co.in', address: { line1: 'Unit 4, Capital Towers', city: 'Mumbai', state: 'Maharashtra', pincode: '400051' } },
      { name: 'Niti Sharma', firmName: 'Creative Hive', phone: '8222233344', clientType: 'direct_client', email: 'niti@hive.in', address: { line1: 'F-21, High Street', city: 'Anand', state: 'Gujarat', pincode: '388001' } },
      { name: 'Amit Jain', firmName: 'Innova Hub', phone: '8333344455', clientType: 'direct_client', gstin: '24KKYY5555L1Z1', email: 'amit@innova.com', address: { line1: 'Building 12, SEZ', city: 'Gandhinagar', state: 'Gujarat', pincode: '382010' } },
      { name: 'Priya Das', firmName: 'SoftServe Inc.', phone: '8444455566', clientType: 'direct_client', email: 'priya@softserve.com', address: { line1: 'Green Building, 3rd Floor', city: 'Ahmedabad', state: 'Gujarat', pincode: '380009' } },
      { name: 'Rohan Varma', firmName: 'Global Logistics', phone: '8555566677', clientType: 'direct_client', email: 'logistics@global.com', address: { line1: 'Port Road, Industrial Area', city: 'Vadodara', state: 'Gujarat', pincode: '390001' } },
      { name: 'Anita Bose', firmName: 'Zen Workspace', phone: '8666677788', clientType: 'direct_client', email: 'anita@zen.in', address: { line1: 'Quiet Street, Block 2', city: 'Surat', state: 'Gujarat', pincode: '395001' } },
      { name: 'Vishal Nair', firmName: 'NextGen Systems', phone: '8777788899', clientType: 'direct_client', email: 'vishal@nextgen.io', address: { line1: 'Metro Plaza, Cabin 9', city: 'Bangalore', state: 'Karnataka', pincode: '560002' } }
    ],
    inventory: [
      { itemName: 'MDF Board (18mm)', category: 'board', unit: 'sheets', currentStock: 400, minStock: 100, pricePerUnit: 1450, supplier: 'GreenPly' },
      { itemName: 'Modular Steel Legs', category: 'hardware', unit: 'set', currentStock: 250, minStock: 50, pricePerUnit: 3200, supplier: 'SteelWorks' },
      { itemName: 'Acoustic Panels (Grey)', category: 'hardware', unit: 'pcs', currentStock: 300, minStock: 40, pricePerUnit: 1100, supplier: 'QuietSpaces' },
      { itemName: 'Nylon Mesh (Black)', category: 'fabric', unit: 'mtr', currentStock: 500, minStock: 100, pricePerUnit: 650, supplier: 'Universal Mesh' },
      { itemName: 'Smart Locking System', category: 'hardware', unit: 'pcs', currentStock: 120, minStock: 20, pricePerUnit: 5500, supplier: 'TechLock' }
    ],
    quotations: [
      { projectName: 'Innovation Lab Setup', items: [{ srNo: 1, category: 'Furniture', description: 'Ergo-Mesh Task Chairs', qty: 25, unit: 'pcs', mrp: 12500, sellingPrice: 9800 }], status: 'converted' },
      { projectName: 'Co-working Hotdesks', items: [{ srNo: 1, category: 'Furniture', description: 'Linear 4-seater Bench', qty: 10, unit: 'pcs', mrp: 45000, sellingPrice: 38000 }], status: 'converted' },
      { projectName: 'Executive Pods', items: [{ srNo: 1, category: 'Furniture', description: 'Soundfront Solo Pod', qty: 3, unit: 'pcs', mrp: 150000, sellingPrice: 135000 }], status: 'converted' },
      { projectName: 'Meeting Room Setup', items: [{ srNo: 1, category: 'Furniture', description: '12-seater Board Table', qty: 1, unit: 'pcs', mrp: 85000, sellingPrice: 75000 }], status: 'converted' },
      { projectName: 'Reception Desk', items: [{ srNo: 1, category: 'Furniture', description: 'Curved Stone-top Desk', qty: 1, unit: 'pcs', mrp: 65000, sellingPrice: 58000 }], status: 'converted' },
      { projectName: 'Breakout Zone', items: [{ srNo: 1, category: 'Furniture', description: 'Soft-seating modules', qty: 12, unit: 'pcs', mrp: 18000, sellingPrice: 15000 }], status: 'converted' },
      { projectName: 'Server Room Storage', items: [{ srNo: 1, category: 'Furniture', description: 'Metal Rack Cabinets', qty: 6, unit: 'pcs', mrp: 28000, sellingPrice: 24000 }], status: 'sent' },
      { projectName: 'Conference Seating', items: [{ srNo: 1, category: 'Furniture', description: 'Leatherette Board Chairs', qty: 12, unit: 'pcs', mrp: 22000, sellingPrice: 19500 }], status: 'sent' },
      { projectName: 'Cafeteria Benches', items: [{ srNo: 1, category: 'Furniture', description: 'Solid-top Cafe Bench', qty: 15, unit: 'pcs', mrp: 12000, sellingPrice: 10500 }], status: 'draft' }
    ]
  }
};

const seedDummy = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const companies = await Company.find({ isActive: true });
  for (const company of companies) {
    const CID = company._id;
    const slug = company.slug;
    const data = datasets[slug] || datasets['maruti-furniture'];
    const domain = slug === 'maruti-furniture' ? 'maruti.com' : 'furnituno.com';

    console.log(`\n🏢 Seeding ${data.quotations.length} records for: ${company.name}`);

    const superAdmin = await User.findOne({ companyId: CID, isSuperAdmin: true });
    if (!superAdmin) continue;

    // Clear data
    await Promise.all([
      Client.deleteMany({ companyId: CID }), Inventory.deleteMany({ companyId: CID }),
      Quotation.deleteMany({ companyId: CID }), Project.deleteMany({ companyId: CID }),
      JobCard.deleteMany({ companyId: CID }), DesignRequest.deleteMany({ companyId: CID }),
      StoreStage.deleteMany({ companyId: CID }), ProductionStage.deleteMany({ companyId: CID }),
      QcStage.deleteMany({ companyId: CID }), DispatchStage.deleteMany({ companyId: CID }),
      Invoice.deleteMany({ companyId: CID }), PurchaseOrder.deleteMany({ companyId: CID }),
      Counter.deleteMany({ _id: new RegExp(`^${CID}_`) }),
      User.deleteMany({ companyId: CID, isSuperAdmin: { $ne: true } }),
      UserPermission.deleteMany({ companyId: CID, userId: { $ne: superAdmin._id } }),
    ]);

    // 1. Staff
    const staff = {};
    const staffRoles = ['sales', 'design', 'store', 'production', 'qc', 'dispatch', 'accountant'];
    for (const role of staffRoles) {
      const dept = role === 'accountant' ? 'accounts' : role;
      const u = await User.create({
        companyId: CID, name: `${role.charAt(0).toUpperCase() + role.slice(1)} Person`,
        email: `${role}@${domain}`, password: 'Staff@1234', isActive: true, role, department: dept
      });
      staff[role] = u;
      const roleDoc = await Role.findOne({ companyId: CID, name: role });
      if (roleDoc) {
        await UserPermission.create({
          companyId: CID, userId: u._id, roleId: roleDoc._id, permissionSetIds: [], overrides: [], effectivePermissions: roleDoc.permissions,
        });
      }
    }

    // 2. Clients
    const createdClients = [];
    for (const c of data.clients) {
      createdClients.push(await Client.create({ companyId: CID, ...c, createdBy: superAdmin._id }));
    }

    // 3. Inventory
    for (const i of data.inventory) {
      await Inventory.create({ companyId: CID, ...i, updatedBy: staff.store._id });
    }

    // 4. Quotations, Projects, JobCards (converted only)
    let seq = 0;
    for (let j = 0; j < data.quotations.length; j++) {
      const qDef = data.quotations[j];
      const client = createdClients[j % createdClients.length];
      const q = await Quotation.create({
        companyId: CID, quotationNumber: `${company.quotationPrefix}-2026-${String(j+1).padStart(3, '0')}`,
        clientId: client._id, projectName: qDef.projectName, items: qDef.items,
        status: qDef.status, handledBy: staff.sales._id, siteAddress: client.address,
        createdBy: staff.sales._id
      });

      if (q.status === 'converted') {
        const p = await Project.create({
          companyId: CID, projectNumber: `${company.projectPrefix}-PRJ-${String(j+1).padStart(3, '0')}`,
          clientId: client._id, quotationId: q._id, projectName: q.projectName,
          status: 'active', priority: 'high', expectedDelivery: ahead(30), createdBy: superAdmin._id
        });
        await Quotation.findByIdAndUpdate(q._id, { projectId: p._id });

        const jc = await JobCard.create({
          companyId: CID, jobCardNumber: `${company.jobCardPrefix}-JC-${String(j+1).padStart(3, '0')}`,
          projectId: p._id, clientId: client._id, quotationId: q._id,
          title: q.projectName, items: q.items, salesperson: { id: staff.sales._id, name: staff.sales.name },
          status: 'in_production', priority: 'high', orderDate: ago(3), createdBy: superAdmin._id
        });
        seq = j + 1;
      }
    }

    // 5. Counters
    await Counter.findOneAndUpdate({ _id: `${CID}_quotation` }, { seq: data.quotations.length }, { upsert: true });
    await Counter.findOneAndUpdate({ _id: `${CID}_project` }, { seq }, { upsert: true });
    await Counter.findOneAndUpdate({ _id: `${CID}_jobcard` }, { seq }, { upsert: true });
    
    console.log(`   ✅ Seeding complete for ${company.name}`);
  }

  console.log('\n🎉 All companies seeded with asymmetrical data volumes!');
  await mongoose.disconnect();
  process.exit(0);
};

seedDummy().catch(err => { console.error(err); process.exit(1); });
