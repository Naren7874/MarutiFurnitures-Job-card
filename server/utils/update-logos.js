/**
 * Update Logos Script
 * Updates company logos in MongoDB using the SVG files from the client/public folder.
 * Run once: node utils/update-logos.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '../.env') });

import Company from '../models/Company.js';

// Paths to SVG logos relative to server/utils/
const MARUTI_SVG_PATH = path.join(__dirname, '../../client/public/Maruti icon.svg');
const FURNITUNO_SVG_PATH = path.join(__dirname, '../../client/public/Furnituno Logo.svg');

const svgToDataUri = (filePath) => {
  const svgContent = readFileSync(filePath, 'utf-8');
  // Encode SVG as base64 data URI (works perfectly in Puppeteer PDF rendering)
  const base64 = Buffer.from(svgContent).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // ── 1. Update Maruti Furniture logo ────────────────────────────────────────
  const marutiLogo = svgToDataUri(MARUTI_SVG_PATH);
  const maruti = await Company.findOneAndUpdate(
    { slug: 'maruti-furniture' },
    { logo: marutiLogo },
    { new: true }
  );
  if (maruti) {
    console.log(`✅ Updated logo for: ${maruti.name}`);
  } else {
    console.log('⚠️  Company "maruti-furniture" not found in DB');
  }

  // ── 2. Update / rename second company to Furnituno ─────────────────────────
  const furniLogo = svgToDataUri(FURNITUNO_SVG_PATH);
  
  // Try 'brand-two' slug first, then 'furnituno'
  let furnituno = await Company.findOne({ slug: { $in: ['brand-two', 'furnituno'] } });

  if (furnituno) {
    await Company.findByIdAndUpdate(furnituno._id, {
      name:            'Furnituno',
      slug:            'furnituno',
      tagline:         'Modern Living Solutions',
      logo:            furniLogo,
      quotationPrefix: 'FN',
      jobCardPrefix:   'FN',
      invoicePrefix:   'FN',
      projectPrefix:   'FN',
    });
    console.log(`✅ Updated logo & renamed to: Furnituno (was: ${furnituno.name})`);
  } else {
    console.log('⚠️  Second company not found (brand-two / furnituno). Creating it...');
    await Company.create({
      name:            'Furnituno',
      slug:            'furnituno',
      tagline:         'Modern Living Solutions',
      logo:            furniLogo,
      phone:           '9876543211',
      email:           'info@furnituno.com',
      address:         { city: 'Ahmedabad', state: 'Gujarat', pincode: '380059' },
      quotationPrefix: 'FN',
      jobCardPrefix:   'FN',
      invoicePrefix:   'FN',
      projectPrefix:   'FN',
      gstRates:        { cgst: 9, sgst: 9, igst: 18 },
      isActive:        true,
    });
    console.log('✅ Created Furnituno company with logo');
  }

  console.log('\n🎉 Logo update complete!\n');
  console.log('Both company logos are now stored as base64 SVG data URIs.');
  console.log('They will appear automatically in Quotation and Job Card PDFs.');

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
