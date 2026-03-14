/**
 * Quick script to update company logos in the database without re-seeding everything.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const companySchema = new mongoose.Schema({
  name: String,
  logo: String,
  slug: String
});

const Company = mongoose.model('Company', companySchema);

const updateLogos = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const maruti = await Company.findOneAndUpdate(
      { slug: 'maruti-furniture' },
      { logo: '/Maruti icon_New.svg' },
      { new: true }
    );
    console.log('Updated Maruti:', maruti?.logo);

    const furnituno = await Company.findOneAndUpdate(
      { slug: 'furnituno' },
      { logo: '/furnituno' }, // Checking slug first
      { logo: '/Furnituno Logo_New.svg' },
      { new: true }
    );
    
    // Correcting the manual logic
    await Company.updateOne({ slug: 'furnituno' }, { logo: '/Furnituno Logo_New.svg' });
    console.log('Updated Furnituno Logo');

    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

updateLogos();
