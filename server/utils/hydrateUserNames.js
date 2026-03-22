import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    const users = await mongoose.connection.db.collection('users').find({
      $or: [
        { firstName: { $exists: false } },
        { lastName: { $exists: false } },
        { firstName: '' },
        { lastName: '' }
      ]
    }).toArray();

    console.log(`Found ${users.length} users to hydrate.`);

    for (const user of users) {
      let firstName = user.firstName || '';
      let lastName = user.lastName || '';

      if (!firstName || !lastName) {
        const fullParts = (user.name || '').trim().split(/\s+/);
        if (fullParts.length >= 2) {
          firstName = fullParts[0];
          lastName = fullParts.slice(1).join(' ');
        } else if (fullParts.length === 1 && fullParts[0]) {
          firstName = fullParts[0];
          lastName = 'User';
        } else {
          firstName = 'User';
          lastName = 'Member';
        }
      }

      console.log(`Updating user ${user.email || user._id}: "${user.name}" -> "${firstName}" "${lastName}"`);
      
      await mongoose.connection.db.collection('users').updateOne(
        { _id: user._id },
        { 
          $set: { 
            firstName: firstName,
            lastName: lastName,
            name: `${firstName} ${lastName}` // Sync name too
          } 
        }
      );
    }

    console.log('Hydration complete.');
  } catch (err) {
    console.error('Error during hydration:', err);
  } finally {
    process.exit();
  }
}

run();
