import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config({ path: './.env' });

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ email: 'malinarendra7874@gmail.com' });
    if (user) {
      console.log('User Details:');
      console.log('First Name:', user.firstName);
      console.log('Phone:', user.phone);
      console.log('Calculated Formula Password:', `${user.firstName}${user.phone ? user.phone.trim().replace(/\s+/g, '').slice(-4) : '1234'}`);
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
