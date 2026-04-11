import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DispatchMember from '../models/DispatchMember.js';
import User from '../models/User.js';

dotenv.config();

/**
 * Migration Script: Transition existing individual Dispatch users
 * to the new Team Member model and setup a shared login account.
 */
async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const dispatchers = await User.find({ role: 'dispatch' });
    console.log(`Found ${dispatchers.length} legacy dispatch users.`);

    for (const user of dispatchers) {
      if (user.email === 'dispatch@maruti.com') {
        console.log(`Skipping shared account ${user.email}`);
        continue;
      }

      // 1. Create DispatchMember record
      const existingMember = await DispatchMember.findOne({
        companyId: user.companyId,
        name: user.name
      });

      if (!existingMember) {
        await DispatchMember.create({
          companyId: user.companyId,
          name: user.name,
          phone: user.phone || '',
          isActive: true
        });
        console.log(`[CREATED] Team Member: ${user.name}`);
      } else {
        console.log(`[EXISTS] Team Member: ${user.name}`);
      }

      // 2. Deactivate the old individual account
      user.isActive = false;
      await user.save();
      console.log(`[DEACTIVATED] Legacy Account: ${user.email}`);
    }

    // 3. Ensure a shared account exists for Maruti Furniture (main company)
    const marutiCompanyId = dispatchers[0]?.companyId; // Using the first company found
    if (marutiCompanyId) {
      const sharedAccount = await User.findOne({ email: 'dispatch@maruti.com' });
      if (!sharedAccount) {
        // Note: Password must be hashed by the mongoose pre-save hook automatically
        await User.create({
          firstName: 'Dispatch',
          lastName: 'Team',
          email: 'dispatch@maruti.com',
          password: 'dispatch2026',
          role: 'dispatch',
          companyId: marutiCompanyId,
          isActive: true
        });
        console.log('[CREATED] Shared Account: dispatch@maruti.com (Pass: dispatch2026)');
      } else {
        sharedAccount.password = 'dispatch2026';
        await sharedAccount.save();
        console.log('[UPDATED] Shared Account password: dispatch@maruti.com (Pass: dispatch2026)');
      }
    }

    console.log('\nMigration Complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
