/**
 * Quick Verification Script for Multi-Tenant Seeding
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

import Company from '../models/Company.js';
import Client from '../models/Client.js';
import { Inventory } from '../models/Inventory.js';
import Quotation from '../models/Quotation.js';

async function verify() {
  await mongoose.connect(process.env.MONGO_URI);
  const companies = await Company.find({ isActive: true });
  
  console.log('\n🔍 --- SEED DATA VERIFICATION ---');
  
  for (const c of companies) {
    const clients = await Client.countDocuments({ companyId: c._id });
    const items = await Inventory.find({ companyId: c._id }).limit(2);
    const quotes = await Quotation.countDocuments({ companyId: c._id });
    
    console.log(`\n🏢 Company: ${c.name} (${c.slug})`);
    console.log(`   - Clients: ${clients}`);
    console.log(`   - Quotations: ${quotes}`);
    console.log(`   - Sample Inventory:`);
    items.forEach(i => console.log(`     • ${i.itemName} (${i.category})`));
  }
  
  await mongoose.disconnect();
}

verify().catch(console.error);
