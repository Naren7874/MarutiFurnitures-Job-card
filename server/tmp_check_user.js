import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const count = await mongoose.connection.db.collection('users').countDocuments({ 
      $or: [
        { firstName: { $exists: false } }, 
        { lastName: { $exists: false } }
      ] 
    });
    console.log('Users missing firstName/lastName:', count);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

run();
