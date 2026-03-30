/**
 * migrate-overrides-global.js
 *
 * One-time migration: moves all overrides from the `UserPermission.overrides`
 * embedded array to the new global `UserOverride` collection (no companyId).
 *
 * Run: node server/migrate-overrides-global.js
 *
 * Safe to run multiple times (uses findOneAndUpdate with upsert).
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });

// Raw access to OLD UserPermission (still has overrides embedded in DB)
const OldUserPermission = mongoose.model('UserPermission', new mongoose.Schema({
  userId:    mongoose.Schema.Types.ObjectId,
  companyId: mongoose.Schema.Types.ObjectId,
  overrides: [{
    permission: String,
    type: String,
    reason: String,
    expiresAt: Date,
    grantedBy: mongoose.Schema.Types.ObjectId,
    grantedAt: Date,
  }],
}, { strict: false }));

const UserOverrideSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  permission: { type: String, required: true },
  type:       { type: String, enum: ['grant', 'deny'], required: true },
  reason:     String,
  expiresAt:  Date,
  grantedBy:  mongoose.Schema.Types.ObjectId,
  grantedAt:  { type: Date, default: Date.now },
}, { timestamps: false });
UserOverrideSchema.index({ userId: 1, permission: 1 }, { unique: true });
const UserOverride = mongoose.model('UserOverride', UserOverrideSchema);

const migrate = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Find all UserPermission records that still have overrides
  const records = await OldUserPermission.find({ 'overrides.0': { $exists: true } }).lean();
  console.log(`🔍 Found ${records.length} UserPermission records with embedded overrides`);

  let migrated = 0;
  let skipped = 0;

  for (const record of records) {
    for (const o of record.overrides || []) {
      if (!o.permission || !o.type) { skipped++; continue; }

      try {
        await UserOverride.findOneAndUpdate(
          { userId: record.userId, permission: o.permission },
          {
            type: o.type,
            reason: o.reason || '',
            expiresAt: o.expiresAt || null,
            grantedBy: o.grantedBy || null,
            grantedAt: o.grantedAt || new Date(),
          },
          { upsert: true, new: true }
        );
        migrated++;
      } catch (err) {
        console.warn(`⚠️  Skipped (${record.userId} / ${o.permission}): ${err.message}`);
        skipped++;
      }
    }
  }

  console.log(`✅ Migrated ${migrated} overrides to UserOverride collection`);
  console.log(`⚠️  Skipped ${skipped} (duplicates or invalid)`);

  // Clean up embedded overrides from UserPermission
  const result = await mongoose.connection.collection('userpermissions').updateMany(
    { 'overrides.0': { $exists: true } },
    { $unset: { overrides: '' } }
  );
  console.log(`🧹 Cleared old overrides from ${result.modifiedCount} UserPermission records`);

  await mongoose.disconnect();
  console.log('✅ Migration complete');
};

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
