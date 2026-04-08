import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

import { Role } from '../models/Role.js';

const listRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const roles = await Role.find({});
    console.log('Current Roles in DB:');
    roles.forEach(r => console.log(`- "${r.name}"`));

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to list roles:', err);
    process.exit(1);
  }
};

listRoles();
