import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './server/models/User.js';

dotenv.config({ path: 'server/.env' });

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ email: 'malinarendra7874@gmail.com' });
    console.log('User Found:', !!user);
    if (user) {
      console.log('User ID:', user._id);
      console.log('isActive:', user.isActive);
      console.log('tokenVersion:', user.tokenVersion);
      console.log('Password Hash length:', user.password ? user.password.length : 'NULL');
      console.log('Password Hash (first 10):', user.password ? user.password.substring(0, 10) : 'N/A');
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
