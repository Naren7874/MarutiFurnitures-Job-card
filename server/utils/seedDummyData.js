/**
 * Seed Dummy Data — run AFTER reseed.js to populate realistic sample data
 * Usage: node utils/seedDummyData.js
 *
 * Creates: staff users, clients, inventory, quotations, projects, job cards,
 * stage documents, invoices, purchase orders, and counter records
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

// ── Helpers ─────────────────────────────────────────────────────────────────
const ago = (days) => new Date(Date.now() - days * 86400000);
const ahead = (days) => new Date(Date.now() + days * 86400000);

// ── MAIN ────────────────────────────────────────────────────────────────────
const seedDummy = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // ── Lookup existing company + super admin ────────────────────────────────
  const company = await Company.findOne({ slug: 'maruti-furniture' });
  if (!company) {
    console.error('❌ Maruti Furniture company not found. Run reseed.js first.');
    process.exit(1);
  }
  const CID = company._id;
  const superAdmin = await User.findOne({ companyId: CID, isSuperAdmin: true });
  if (!superAdmin) {
    console.error('❌ Super admin not found. Run reseed.js first.');
    process.exit(1);
  }

  // Clean ALL business data (global, not scoped) since reseed creates new company IDs
  console.log('🗑  Clearing existing dummy data...');
  await Promise.all([
    Client.deleteMany({}),
    Inventory.deleteMany({}),
    Quotation.deleteMany({}),
    Project.deleteMany({}),
    JobCard.deleteMany({}),
    DesignRequest.deleteMany({}),
    StoreStage.deleteMany({}),
    ProductionStage.deleteMany({}),
    QcStage.deleteMany({}),
    DispatchStage.deleteMany({}),
    Invoice.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    Counter.deleteMany({}),
    // Delete staff users but keep super admin
    User.deleteMany({ companyId: CID, isSuperAdmin: { $ne: true } }),
    UserPermission.deleteMany({ companyId: CID, userId: { $ne: superAdmin._id } }),
  ]);
  console.log('✅ Cleared existing dummy data');

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. STAFF USERS
  // ═══════════════════════════════════════════════════════════════════════════
  const staffDefs = [
    { name: 'Harsh Kumar',     email: 'harsh@maruti.com',     role: 'sales',      department: 'sales',      phone: '9876500001' },
    { name: 'Priya Sharma',    email: 'priya@maruti.com',     role: 'design',     department: 'design',     phone: '9876500002' },
    { name: 'Vikram Patel',    email: 'vikram@maruti.com',    role: 'store',      department: 'store',      phone: '9876500003' },
    { name: 'Ramesh Solanki',  email: 'ramesh@maruti.com',    role: 'production', department: 'production', phone: '9876500004' },
    { name: 'Amit Verma',      email: 'amit@maruti.com',      role: 'qc',         department: 'qc',         phone: '9876500005' },
    { name: 'Sunil Joshi',     email: 'sunil@maruti.com',     role: 'dispatch',   department: 'dispatch',   phone: '9876500006' },
    { name: 'Neha Mehta',      email: 'neha@maruti.com',      role: 'accountant', department: 'accounts',   phone: '9876500007' },
  ];

  const staff = {};
  for (const s of staffDefs) {
    const user = await User.create({
      companyId: CID, ...s, password: 'Staff@1234',
      whatsappNumber: s.phone, isActive: true,
    });
    staff[s.role] = user;

    const roleDoc = await Role.findOne({ companyId: CID, name: s.role });
    if (roleDoc) {
      await UserPermission.create({
        companyId: CID, userId: user._id, roleId: roleDoc._id,
        permissionSetIds: [], overrides: [],
        effectivePermissions: roleDoc.permissions,
      });
    }
    console.log(`   👤 ${s.role}: ${s.email}`);
  }
  console.log('✅ 7 staff users created');

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CLIENTS
  // ═══════════════════════════════════════════════════════════════════════════
  const clientDefs = [
    { name: 'Ram Tiwari',     firmName: 'GMP Industries Pvt. Ltd.',  phone: '7226006767', clientType: 'direct_client', gstin: '24AABCG1234M1Z5', email: 'ram@gmpindustries.in',    address: { line1: 'Plot 42, GIDC', city: 'Anand', state: 'Gujarat', pincode: '388001' } },
    { name: 'Maulik Pavagadi', firmName: '',                         phone: '9876512345', clientType: 'direct_client', gstin: '',                  email: 'maulik@gmail.com',        address: { line1: '15 Sunshine Society', city: 'Anand', state: 'Gujarat', pincode: '388001' } },
    { name: 'Ar. Dreamscape',  firmName: 'Dreamscape Architects',   phone: '9876567890', clientType: 'architect',     gstin: '24AABCD5678N1Z5', email: 'info@dreamscape.in',      address: { line1: 'Tower B, Corporate Park', city: 'Ahmedabad', state: 'Gujarat', pincode: '380015' } },
    { name: 'Rajesh Desai',    firmName: 'Hotel Grand Gujarat',     phone: '9876598765', clientType: 'direct_client', gstin: '24AABCH9012P1Z5', email: 'rajesh@hotelgrand.in',    address: { line1: 'SG Highway', city: 'Ahmedabad', state: 'Gujarat', pincode: '380054' } },
    { name: 'Sanjay Patel',    firmName: 'Patel Constructions',     phone: '9876534567', clientType: 'contractor',    gstin: '24AABCP3456Q1Z5', email: 'sanjay@patelconst.in',    address: { line1: '23 Narayan Park', city: 'Vadodara', state: 'Gujarat', pincode: '390007' } },
  ];

  const clients = [];
  for (const c of clientDefs) {
    const client = await Client.create({
      companyId: CID, ...c,
      whatsappNumber: c.phone,
      gstVerified: !!c.gstin,
      gstBusinessName: c.firmName || undefined,
      gstState: 'Gujarat',
      gstStatus: c.gstin ? 'Active' : undefined,
      taxType: c.gstin ? 'regular' : 'urp',
      createdBy: superAdmin._id,
    });
    clients.push(client);
  }
  console.log('✅ 5 clients created');

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. INVENTORY
  // ═══════════════════════════════════════════════════════════════════════════
  const invDefs = [
    { itemName: 'BWR Plywood 19mm',        category: 'board',    unit: 'sheets', currentStock: 120, minStock: 20, pricePerUnit: 2800, supplier: 'Century Ply' },
    { itemName: 'MR Plywood 12mm',         category: 'board',    unit: 'sheets', currentStock: 80,  minStock: 15, pricePerUnit: 1800, supplier: 'Century Ply' },
    { itemName: 'MDF 18mm',                category: 'board',    unit: 'sheets', currentStock: 50,  minStock: 10, pricePerUnit: 2200, supplier: 'Greenply' },
    { itemName: 'Greenlam Java Teak 776',  category: 'laminate', unit: 'sheets', currentStock: 40,  minStock: 8,  pricePerUnit: 3500, supplier: 'Greenlam' },
    { itemName: 'Merino White Oak',        category: 'laminate', unit: 'sheets', currentStock: 35,  minStock: 8,  pricePerUnit: 3200, supplier: 'Merino' },
    { itemName: 'Hettich Soft-Close Hinge', category: 'hardware', unit: 'pcs',   currentStock: 500, minStock: 100, pricePerUnit: 180, supplier: 'Hettich India' },
    { itemName: 'Ebco Channel 18"',        category: 'hardware', unit: 'pcs',   currentStock: 200, minStock: 50,  pricePerUnit: 320, supplier: 'Ebco' },
    { itemName: 'Godrej Multi-Lock',       category: 'hardware', unit: 'pcs',   currentStock: 100, minStock: 20,  pricePerUnit: 850, supplier: 'Godrej' },
    { itemName: 'Italian Fabric (per mtr)', category: 'fabric',  unit: 'mtr',   currentStock: 300, minStock: 50,  pricePerUnit: 700, supplier: 'Royal Fabrics' },
    { itemName: 'Rexine Premium Black',    category: 'fabric',   unit: 'mtr',   currentStock: 150, minStock: 30,  pricePerUnit: 450, supplier: 'Karnick Textiles' },
    { itemName: 'Natural Teak Polish',     category: 'polish',   unit: 'ltr',   currentStock: 80,  minStock: 15,  pricePerUnit: 600, supplier: 'Asian Paints' },
    { itemName: 'Black Polish Matte',      category: 'polish',   unit: 'ltr',   currentStock: 60,  minStock: 10,  pricePerUnit: 550, supplier: 'Asian Paints' },
    { itemName: 'White Ash Wood Polish',   category: 'polish',   unit: 'ltr',   currentStock: 45,  minStock: 10,  pricePerUnit: 650, supplier: 'Asian Paints' },
    { itemName: 'Tempered Glass 12mm',     category: 'glass',    unit: 'sqft',  currentStock: 200, minStock: 40,  pricePerUnit: 280, supplier: 'Saint-Gobain' },
    { itemName: 'Black Corian Sheet',      category: 'other',    unit: 'sqft',  currentStock: 100, minStock: 20,  pricePerUnit: 1200, supplier: 'DuPont' },
  ];

  const inventoryItems = [];
  for (const inv of invDefs) {
    const item = await Inventory.create({ companyId: CID, ...inv, updatedBy: staff.store._id });
    inventoryItems.push(item);
  }
  console.log('✅ 15 inventory items created');

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. QUOTATIONS (matching real MF-311025 from user's images)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Quotation 1: GMP Office (CONVERTED) — exactly as in user's images ──
  const q1 = await Quotation.create({
    companyId: CID,
    quotationNumber: 'MF-311025-001',
    clientId: clients[0]._id,
    projectName: 'GMP Office',
    architect: 'Ar. Dreamscape',
    siteAddress: { line1: 'Plot 42, GIDC', city: 'Anand', state: 'Gujarat', pincode: '388001' },
    deliveryDays: '75 to 90 days',
    validUntil: ahead(60),
    items: [
      { srNo: 1, category: 'Reception Area', description: '2 Seater Sofa', qty: 3, unit: 'pcs', mrp: 27000, sellingPrice: 27000, specifications: { size: 'L-59" x D-30"', fabric: 'Italian Fabric', hardware: 'Metal Legs : Black Color' } },
      { srNo: 2, category: 'Reception Area', description: 'Corner Table', qty: 5, unit: 'pcs', mrp: 25000, sellingPrice: 25000, specifications: { size: 'Dia-18" x Ht-18"', polish: 'White ash wood with black polish', notes: 'Reception area - 2 nos.\nDirector\'s cabin 1 - 2 nos.\nDirector\'s cabin 2 - 1 nos.' } },
      { srNo: 3, category: 'Café Area', description: 'Chairs', qty: 4, unit: 'pcs', mrp: 3500, sellingPrice: 3500, specifications: { size: 'As per standard', notes: 'As per design' } },
      { srNo: 4, category: 'Director\'s Cabin 1', description: '2 Seater Sofa', qty: 1, unit: 'pcs', mrp: 42000, sellingPrice: 42000, specifications: { size: 'length-65" x depth 31"/33"', hardware: 'Metal Legs : Black Color' } },
      { srNo: 5, category: 'Director\'s Cabin 1', description: 'Center Table', qty: 1, unit: 'pcs', mrp: 45000, sellingPrice: 45000, specifications: { size: '30" x 35"', material: 'Top: white ash wooden top\nBase: black corian material\nEllips shape' } },
      { srNo: 6, category: 'Director\'s Cabin 1', description: 'Armchair', qty: 4, unit: 'pcs', mrp: 38000, sellingPrice: 38000, specifications: { size: 'L-26" x W-27"', hardware: 'Metal Legs : Black Color', fabric: 'Italian Fabric' } },
      { srNo: 7, category: 'Director\'s Cabin', description: "Visitor's Chairs", qty: 6, unit: 'pcs', mrp: 22000, sellingPrice: 22000, specifications: { size: 'L-26" x depth as per standard', polish: 'White ash wood with black polish', notes: 'AS PER DESIGN' } },
      { srNo: 8, category: 'Manager', description: "Visitor's Chairs", qty: 10, unit: 'pcs', mrp: 14500, sellingPrice: 14500, specifications: { size: 'L-26" x depth as per standard', material: 'Wood finish match with laminate.\n(Greenlam - 776 - Java Teak)' } },
    ],
    discount: 71000,
    discountNote: '700 RS per mtr fabric, including',
    gstType: 'cgst_sgst',
    termsAndConditions: [
      '*18% GST extra on all above price.',
      '*No Guarantee or Warranty of any kind is given on Imported furniture, glass, cloth, rexine.',
      '*Delivery Time 120 days after Final  - 50% Payment Advance & 50% Before Delivery',
      '*Transportation (Delivery) Charge, Packing Charge 2% & Labour Charge (Floorwise) Will be Extra',
      '* When the Goods arrive, after the arrangement is made, check & Release the deliveryman, if there is any damage after that the Responsibility will not remain with The Company',
    ],
    status: 'converted',
    sentAt: ago(45),
    approvedAt: ago(40),
    approvedBy: 'Ram Tiwari (Client)',
    handledBy: staff.sales._id,
    createdBy: staff.sales._id,
  });
  console.log(`   📄 Quotation 1: ${q1.quotationNumber} — GMP Office (₹${q1.grandTotal})`);

  // ── Quotation 2: Patel Residence (APPROVED, not yet converted) ──
  const q2 = await Quotation.create({
    companyId: CID,
    quotationNumber: 'MF-080326-002',
    clientId: clients[4]._id,
    projectName: 'Patel Residence - Vadodara',
    architect: '',
    siteAddress: { line1: '23 Narayan Park', city: 'Vadodara', state: 'Gujarat', pincode: '390007' },
    deliveryDays: '60 to 75 days',
    validUntil: ahead(45),
    items: [
      { srNo: 1, category: 'Master Bedroom', description: 'Wardrobe 8x7 ft', qty: 1, unit: 'pcs', mrp: 185000, sellingPrice: 175000, specifications: { size: '8ft x 7ft x 2ft', material: 'BWR Ply 19mm + Greenlam Java Teak', hardware: 'Hettich soft-close' } },
      { srNo: 2, category: 'Dining Room', description: '6 Seater Dining Table', qty: 1, unit: 'set', mrp: 95000, sellingPrice: 88000, specifications: { size: '6ft x 3.5ft', material: 'Solid sheesham wood', polish: 'Natural Teak' } },
      { srNo: 3, category: 'Living Room', description: 'TV Unit with Storage', qty: 1, unit: 'pcs', mrp: 65000, sellingPrice: 58000, specifications: { size: '7ft x 5ft', material: 'BWR Ply + Laminate', hardware: 'Push-to-open, concealed hinges' } },
      { srNo: 4, category: 'Entrance', description: 'Shoe Rack with Mirror', qty: 1, unit: 'pcs', mrp: 35000, sellingPrice: 32000, specifications: { size: '3ft x 6ft', material: 'MDF 18mm + Mirror', hardware: 'Soft-close drawers' } },
    ],
    discount: 3000,
    gstType: 'igst',
    termsAndConditions: company.defaultTermsAndConditions,
    status: 'approved',
    sentAt: ago(10),
    approvedAt: ago(5),
    approvedBy: 'Sanjay Patel',
    handledBy: staff.sales._id,
    createdBy: staff.sales._id,
  });
  console.log(`   📄 Quotation 2: ${q2.quotationNumber} — Patel Residence (₹${q2.grandTotal})`);

  // ── Quotation 3: Hotel Grand Lobby (DRAFT) ──
  const q3 = await Quotation.create({
    companyId: CID,
    quotationNumber: 'MF-080326-003',
    clientId: clients[3]._id,
    projectName: 'Hotel Grand Lobby',
    architect: '',
    siteAddress: { line1: 'SG Highway', city: 'Ahmedabad', state: 'Gujarat', pincode: '380054' },
    deliveryDays: '90 to 120 days',
    validUntil: ahead(30),
    items: [
      { srNo: 1, category: 'Lobby', description: 'Reception Counter (Curved)', qty: 1, unit: 'pcs', mrp: 350000, sellingPrice: 320000, specifications: { size: '12ft x 4ft x 3.5ft', material: 'Solid wood + Corian top', polish: 'Dark walnut' } },
      { srNo: 2, category: 'Lobby', description: 'Lounge Sofa Set (3+2+1)', qty: 1, unit: 'set', mrp: 280000, sellingPrice: 260000, specifications: { fabric: 'Premium Italian leather', hardware: 'Stainless steel legs' } },
      { srNo: 3, category: 'Lobby', description: 'Coffee Tables (Marble Top)', qty: 4, unit: 'pcs', mrp: 45000, sellingPrice: 42000, specifications: { size: 'Dia 24" x Ht 18"', material: 'Marble + brass base' } },
      { srNo: 4, category: 'Bar', description: 'Bar Stools', qty: 8, unit: 'pcs', mrp: 18000, sellingPrice: 16500, specifications: { size: 'Seat Ht 30"', material: 'Solid wood + cushion', hardware: 'Swivel base' } },
      { srNo: 5, category: 'Lobby', description: 'Decorative Wall Shelves', qty: 6, unit: 'pcs', mrp: 25000, sellingPrice: 22000, specifications: { size: '4ft x 1.5ft', material: 'Engineered wood + veneer', polish: 'Matt black' } },
    ],
    discount: 20000,
    gstType: 'cgst_sgst',
    termsAndConditions: company.defaultTermsAndConditions,
    status: 'draft',
    handledBy: staff.sales._id,
    createdBy: staff.sales._id,
  });
  console.log(`   📄 Quotation 3: ${q3.quotationNumber} — Hotel Grand Lobby DRAFT (₹${q3.grandTotal})`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. PROJECTS (from converted quotation Q1)
  // ═══════════════════════════════════════════════════════════════════════════
  const proj1 = await Project.create({
    companyId: CID,
    projectNumber: 'MF-PRJ-2026-001',
    clientId: clients[0]._id,
    quotationId: q1._id,
    projectName: 'GMP Office',
    architect: 'Ar. Dreamscape',
    siteAddress: q1.siteAddress,
    clientGstin: clients[0].gstin,
    priority: 'high',
    expectedDelivery: ahead(30),
    assignedStaff: Object.values(staff).map(u => u._id),
    status: 'active',
    createdBy: superAdmin._id,
  });
  // Link quotation back
  await Quotation.findByIdAndUpdate(q1._id, { projectId: proj1._id });
  console.log(`   📁 Project 1: ${proj1.projectNumber} — GMP Office`);

  // Project 2 from Q2 (approved → convert to project)
  const proj2 = await Project.create({
    companyId: CID,
    projectNumber: 'MF-PRJ-2026-002',
    clientId: clients[4]._id,
    quotationId: q2._id,
    projectName: 'Patel Residence - Vadodara',
    siteAddress: q2.siteAddress,
    clientGstin: clients[4].gstin,
    priority: 'medium',
    expectedDelivery: ahead(60),
    assignedStaff: Object.values(staff).map(u => u._id),
    status: 'active',
    createdBy: superAdmin._id,
  });
  await Quotation.findByIdAndUpdate(q2._id, { status: 'converted', projectId: proj2._id });
  console.log(`   📁 Project 2: ${proj2.projectNumber} — Patel Residence`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. JOB CARDS
  // ═══════════════════════════════════════════════════════════════════════════
  const assignedTo = {
    design: [staff.design._id], store: [staff.store._id],
    production: [staff.production._id], qc: [staff.qc._id],
    dispatch: [staff.dispatch._id], accountant: [staff.accountant._id],
  };

  // ── JC-1: GMP Reception Sofas — DELIVERED ──
  const jc1 = await JobCard.create({
    companyId: CID, jobCardNumber: 'MF-26-001',
    projectId: proj1._id, clientId: clients[0]._id, quotationId: q1._id,
    title: 'GMP Reception Area - Sofas & Tables',
    items: [
      { srNo: 1, description: '2 Seater Sofa', qty: 3, unit: 'pcs', specifications: { size: 'L-59" x D-30"', fabric: 'Italian Fabric', hardware: 'Metal Legs : Black Color' } },
      { srNo: 2, description: 'Corner Table', qty: 5, unit: 'pcs', specifications: { size: 'Dia-18" x Ht-18"', polish: 'White ash wood with black polish' } },
    ],
    salesperson: { id: staff.sales._id, name: 'Harsh Kumar' },
    assignedTo,
    status: 'delivered',
    priority: 'high',
    orderDate: ago(40),
    expectedDelivery: ago(5),
    actualDelivery: ago(3),
    activityLog: [
      { action: 'status_changed', doneByName: 'System', prevStatus: 'active', newStatus: 'in_store', timestamp: ago(35) },
      { action: 'status_changed', doneByName: 'System', prevStatus: 'in_store', newStatus: 'material_ready', timestamp: ago(30) },
      { action: 'status_changed', doneByName: 'System', prevStatus: 'material_ready', newStatus: 'in_production', timestamp: ago(30) },
      { action: 'status_changed', doneByName: 'System', prevStatus: 'in_production', newStatus: 'qc_pending', timestamp: ago(10) },
      { action: 'status_changed', doneByName: 'System', prevStatus: 'qc_pending', newStatus: 'qc_passed', timestamp: ago(8) },
      { action: 'status_changed', doneByName: 'System', prevStatus: 'qc_passed', newStatus: 'dispatched', timestamp: ago(5) },
      { action: 'status_changed', doneByName: 'System', prevStatus: 'dispatched', newStatus: 'delivered', timestamp: ago(3) },
    ],
    createdBy: superAdmin._id,
  });
  console.log(`   🔖 JC-1: ${jc1.jobCardNumber} — Reception (delivered)`);

  // ── JC-2: GMP Director's Cabin — IN PRODUCTION ──
  const jc2 = await JobCard.create({
    companyId: CID, jobCardNumber: 'MF-26-002',
    projectId: proj1._id, clientId: clients[0]._id, quotationId: q1._id,
    title: "GMP Director's Cabin - Sofa, Table & Chairs",
    items: [
      { srNo: 1, description: '2 Seater Sofa', qty: 1, unit: 'pcs', specifications: { size: 'length-65" x depth 31"/33"', hardware: 'Metal Legs : Black Color' } },
      { srNo: 2, description: 'Center Table', qty: 1, unit: 'pcs', specifications: { size: '30" x 35"', material: 'White ash wooden top, black corian base' } },
      { srNo: 3, description: 'Armchair', qty: 4, unit: 'pcs', specifications: { size: 'L-26" x W-27"', hardware: 'Metal Legs : Black Color', fabric: 'Italian Fabric' } },
    ],
    salesperson: { id: staff.sales._id, name: 'Harsh Kumar' },
    assignedTo,
    status: 'in_production',
    priority: 'high',
    orderDate: ago(35),
    expectedDelivery: ahead(15),
    activityLog: [
      { action: 'status_changed', doneByName: 'System', prevStatus: 'active', newStatus: 'in_store', timestamp: ago(30) },
      { action: 'status_changed', doneByName: 'System', prevStatus: 'in_store', newStatus: 'in_production', timestamp: ago(25) },
    ],
    createdBy: superAdmin._id,
  });
  console.log(`   🔖 JC-2: ${jc2.jobCardNumber} — Director's Cabin (in_production)`);

  // ── JC-3: GMP Café Chairs — IN STORE ──
  const jc3 = await JobCard.create({
    companyId: CID, jobCardNumber: 'MF-26-003',
    projectId: proj1._id, clientId: clients[0]._id, quotationId: q1._id,
    title: 'GMP Café Area - Chairs',
    items: [
      { srNo: 1, description: 'Café Chairs', qty: 4, unit: 'pcs', specifications: { size: 'As per standard', notes: 'As per design' } },
    ],
    salesperson: { id: staff.sales._id, name: 'Harsh Kumar' },
    assignedTo,
    status: 'in_store',
    priority: 'medium',
    orderDate: ago(30),
    expectedDelivery: ahead(25),
    activityLog: [
      { action: 'status_changed', doneByName: 'System', prevStatus: 'active', newStatus: 'in_store', timestamp: ago(25) },
    ],
    createdBy: superAdmin._id,
  });
  console.log(`   🔖 JC-3: ${jc3.jobCardNumber} — Café Chairs (in_store)`);

  // ── JC-4: Patel Bedroom Wardrobe — ACTIVE (just created) ──
  const jc4 = await JobCard.create({
    companyId: CID, jobCardNumber: 'MF-26-004',
    projectId: proj2._id, clientId: clients[4]._id, quotationId: q2._id,
    title: 'Patel Master Bedroom - Wardrobe',
    items: [
      { srNo: 1, description: 'Wardrobe 8x7 ft', qty: 1, unit: 'pcs', specifications: { size: '8ft x 7ft x 2ft', material: 'BWR Ply 19mm + Greenlam Java Teak', hardware: 'Hettich soft-close' } },
    ],
    salesperson: { id: staff.sales._id, name: 'Harsh Kumar' },
    assignedTo,
    status: 'active',
    priority: 'medium',
    orderDate: ago(3),
    expectedDelivery: ahead(55),
    createdBy: superAdmin._id,
  });
  console.log(`   🔖 JC-4: ${jc4.jobCardNumber} — Patel Wardrobe (active)`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. STAGE DOCUMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Design stages ──
  const makeDesignItems = (jcItems, status) => jcItems.map(i => ({
    srNo: i.srNo, description: i.description, qty: i.qty, unit: i.unit, status,
    measurements: { height: 750, width: 1500, depth: 750, unit: 'mm', notes: 'As per design' },
    materials: { coreBoard: 'BWR Ply 19mm', laminate: 'Greenlam Java Teak', polish: 'Natural Teak', fabric: 'Italian Fabric', hardware: 'Metal Legs Black' },
  }));

  const dr1 = await DesignRequest.create({
    companyId: CID, jobCardId: jc1._id, projectId: proj1._id, clientId: clients[0]._id,
    items: makeDesignItems(jc1.items, 'signed_off'),
    signoff: { status: 'approved', sentAt: ago(38), respondedAt: ago(37), approvedBy: 'Ram Tiwari' },
    status: 'approved', assignedTo: [staff.design._id], createdBy: staff.design._id,
  });
  await JobCard.findByIdAndUpdate(jc1._id, { designRequestId: dr1._id });

  const dr2 = await DesignRequest.create({
    companyId: CID, jobCardId: jc2._id, projectId: proj1._id, clientId: clients[0]._id,
    items: makeDesignItems(jc2.items, 'signed_off'),
    signoff: { status: 'approved', sentAt: ago(32), respondedAt: ago(31), approvedBy: 'Ram Tiwari' },
    status: 'approved', assignedTo: [staff.design._id], createdBy: staff.design._id,
  });
  await JobCard.findByIdAndUpdate(jc2._id, { designRequestId: dr2._id });

  const dr3 = await DesignRequest.create({
    companyId: CID, jobCardId: jc3._id, projectId: proj1._id, clientId: clients[0]._id,
    items: makeDesignItems(jc3.items, 'signed_off'),
    signoff: { status: 'approved', sentAt: ago(27), respondedAt: ago(26), approvedBy: 'Ram Tiwari' },
    status: 'approved', assignedTo: [staff.design._id], createdBy: staff.design._id,
  });
  await JobCard.findByIdAndUpdate(jc3._id, { designRequestId: dr3._id });
  console.log('   ✅ 3 Design stages created');

  // ── Store stages ──
  const makeBOM = (items) => items.map((_, idx) => ({
    inventoryId: inventoryItems[idx % inventoryItems.length]._id,
    materialName: inventoryItems[idx % inventoryItems.length].itemName,
    required: 5, unit: 'sheets', inStock: 120, shortage: 0, issued: true,
    issuedAt: ago(28), issuedBy: staff.store._id,
  }));

  const ss1 = await StoreStage.create({
    companyId: CID, jobCardId: jc1._id, projectId: proj1._id,
    bom: makeBOM(jc1.items), allMaterialsIssued: true, status: 'material_ready',
    issuedBy: staff.store._id, issuedAt: ago(30),
  });
  await JobCard.findByIdAndUpdate(jc1._id, { storeStageId: ss1._id });

  const ss2 = await StoreStage.create({
    companyId: CID, jobCardId: jc2._id, projectId: proj1._id,
    bom: makeBOM(jc2.items), allMaterialsIssued: true, status: 'material_ready',
    issuedBy: staff.store._id, issuedAt: ago(25),
  });
  await JobCard.findByIdAndUpdate(jc2._id, { storeStageId: ss2._id });

  const ss3Bom = jc3.items.map((_, idx) => ({
    inventoryId: inventoryItems[idx % inventoryItems.length]._id,
    materialName: inventoryItems[idx % inventoryItems.length].itemName,
    required: 3, unit: 'sheets', inStock: 120, shortage: 0, issued: false,
  }));
  const ss3 = await StoreStage.create({
    companyId: CID, jobCardId: jc3._id, projectId: proj1._id,
    bom: ss3Bom, allMaterialsIssued: false, status: 'pending',
  });
  await JobCard.findByIdAndUpdate(jc3._id, { storeStageId: ss3._id });
  console.log('   ✅ 3 Store stages created');

  // ── Production stages ──
  const SUBSTAGES = ['cutting','edge_banding','cnc_drilling','assembly','polishing','finishing','hardware_fitting','packing'];

  // JC-1: all 8 done
  const ps1 = await ProductionStage.create({
    companyId: CID, jobCardId: jc1._id, projectId: proj1._id,
    substages: SUBSTAGES.map((name, i) => ({
      name, status: 'done', workerName: 'Ramesh Solanki',
      startedAt: ago(28 - i * 2), completedAt: ago(27 - i * 2),
    })),
    progressNotes: [
      { note: 'Cutting started for sofa frames', addedBy: staff.production._id, addedAt: ago(28) },
      { note: 'All substages completed. Ready for QC.', addedBy: staff.production._id, addedAt: ago(12) },
    ],
    status: 'done', completedBy: staff.production._id, completedAt: ago(10),
    actualCompletion: ago(10),
  });
  await JobCard.findByIdAndUpdate(jc1._id, { productionStageId: ps1._id });

  // JC-2: 4 of 8 done (cutting, edge_banding, cnc_drilling, assembly done. polishing in progress)
  const ps2 = await ProductionStage.create({
    companyId: CID, jobCardId: jc2._id, projectId: proj1._id,
    substages: SUBSTAGES.map((name, i) => {
      if (i < 4) return { name, status: 'done', workerName: 'Ramesh Solanki', startedAt: ago(20 - i * 3), completedAt: ago(19 - i * 3) };
      if (i === 4) return { name, status: 'in_progress', workerName: 'Ramesh Solanki', startedAt: ago(2) };
      return { name, status: 'pending' };
    }),
    progressNotes: [
      { note: 'Assembly complete. Moving to polishing.', addedBy: staff.production._id, addedAt: ago(3) },
    ],
    status: 'in_progress',
    estimatedCompletion: ahead(10),
  });
  await JobCard.findByIdAndUpdate(jc2._id, { productionStageId: ps2._id });
  console.log('   ✅ 2 Production stages created');

  // ── QC stage (JC-1 only — passed) ──
  const qc1 = await QcStage.create({
    companyId: CID, jobCardId: jc1._id, projectId: proj1._id,
    checklist: [
      { parameter: 'Dimensions accuracy', passed: true, notes: 'Within tolerance' },
      { parameter: 'Finish quality', passed: true, notes: 'Smooth polish, no marks' },
      { parameter: 'Hardware fitting', passed: true, notes: 'All legs stable' },
      { parameter: 'Structural integrity', passed: true, notes: 'Weight tested to 150kg' },
      { parameter: 'Fabric quality', passed: true, notes: 'No stitching defects' },
    ],
    verdict: 'pass', reworkCount: 0,
    inspectedBy: staff.qc._id, inspectedAt: ago(8),
  });
  await JobCard.findByIdAndUpdate(jc1._id, { qcStageId: qc1._id });
  console.log('   ✅ 1 QC stage created (passed)');

  // ── Dispatch stage (JC-1 only — delivered) ──
  const ds1 = await DispatchStage.create({
    companyId: CID, jobCardId: jc1._id, projectId: proj1._id,
    scheduledDate: ago(5), timeSlot: '10:00 AM – 12:00 PM',
    deliveryTeam: [
      { name: 'Raju Driver', phone: '9876500010', role: 'Driver' },
      { name: 'Mohan Helper', phone: '9876500011', role: 'Helper' },
    ],
    vehicle: { number: 'GJ-01-AB-1234', type: 'Mini Truck' },
    challanNumber: 'MF-CH-001',
    itemsDispatched: jc1.items.map(i => ({
      srNo: i.srNo, description: i.description, qty: i.qty, dispatchedAt: ago(5),
    })),
    proofOfDelivery: { gpsLocation: '22.5645,72.9289', capturedAt: ago(3) },
    clientNotifiedAt: ago(5),
    status: 'delivered',
    deliveredBy: staff.dispatch._id, deliveredAt: ago(3),
  });
  await JobCard.findByIdAndUpdate(jc1._id, { dispatchStageId: ds1._id });
  console.log('   ✅ 1 Dispatch stage created (delivered)');

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. INVOICE (for delivered JC-1)
  // ═══════════════════════════════════════════════════════════════════════════
  const inv1 = await Invoice.create({
    companyId: CID,
    invoiceNumber: 'MF-INV-2026-001',
    projectId: proj1._id, jobCardIds: [jc1._id],
    clientId: clients[0]._id, quotationId: q1._id,
    placeOfSupply: 'Gujarat (24)',
    clientGstinSnapshot: clients[0].gstin,
    companyGstinSnapshot: company.gstin,
    items: [
      { srNo: 1, description: '2 Seater Sofa (Reception)', qty: 3, unit: 'pcs', rate: 27000, amount: 81000, hsnCode: '9403' },
      { srNo: 2, description: 'Corner Table', qty: 5, unit: 'pcs', rate: 25000, amount: 125000, hsnCode: '9403' },
    ],
    subtotal: 206000, discount: 0, amountAfterDiscount: 206000,
    gstType: 'cgst_sgst', cgst: 18540, sgst: 18540, igst: 0, gstAmount: 37080,
    grandTotal: 243080,
    advancePaid: 121540, balanceDue: 121540,
    dueDate: ahead(15),
    payments: [
      { amount: 121540, mode: 'neft', reference: 'NEFT-GMP-001', paidAt: ago(35), recordedBy: staff.accountant._id },
    ],
    status: 'partially_paid',
    createdBy: staff.accountant._id,
  });
  console.log(`   💰 Invoice: ${inv1.invoiceNumber} — ₹${inv1.grandTotal} (partially paid)`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. PURCHASE ORDER
  // ═══════════════════════════════════════════════════════════════════════════
  const po1 = await PurchaseOrder.create({
    companyId: CID,
    poNumber: 'MF-PO-2026-001',
    projectId: proj1._id, jobCardId: jc2._id,
    items: [
      { inventoryId: inventoryItems[0]._id, materialName: 'BWR Plywood 19mm', qty: 10, unit: 'sheets', pricePerUnit: 2800 },
      { inventoryId: inventoryItems[8]._id, materialName: 'Italian Fabric (per mtr)', qty: 20, unit: 'mtr', pricePerUnit: 700 },
    ],
    supplier: 'Century Ply + Royal Fabrics',
    status: 'received',
    expectedDate: ago(27),
    receivedDate: ago(26),
    createdBy: staff.store._id,
  });
  console.log(`   📦 PO: ${po1.poNumber} — ₹${po1.totalAmount} (received)`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. COUNTER SEQUENCES
  // ═══════════════════════════════════════════════════════════════════════════
  await Counter.create({ _id: `${CID}_quotation`, seq: 3 });
  await Counter.create({ _id: `${CID}_project`,   seq: 2 });
  await Counter.create({ _id: `${CID}_jobcard`,   seq: 4 });
  await Counter.create({ _id: `${CID}_invoice`,   seq: 1 });
  await Counter.create({ _id: `${CID}_po`,        seq: 1 });
  console.log('   ✅ Counter sequences set');

  // ═══════════════════════════════════════════════════════════════════════════
  // DONE
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n🎉 Seed dummy data complete!');
  console.log('─────────────────────────────────────────────');
  console.log(`Company: ${company.name} (${CID})`);
  console.log(`Staff:   7 users (password: Staff@1234)`);
  console.log(`Clients: 5 | Inventory: 15 | Quotations: 3`);
  console.log(`Projects: 2 | Job Cards: 4`);
  console.log(`Stages:  3 design, 3 store, 2 production, 1 QC, 1 dispatch`);
  console.log(`Invoice: 1 | PO: 1`);
  console.log('─────────────────────────────────────────────');
  console.log('Login: admin@maruti.com / Admin@1234');
  console.log('─────────────────────────────────────────────');

  await mongoose.disconnect();
  process.exit(0);
};

seedDummy().catch((err) => {
  console.error('❌ Seed dummy data failed:', err);
  process.exit(1);
});
