import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

import { Role } from '../models/Role.js';

// We'll mock a request and call the controller or just check the logic directly in the DB if we want, 
// but since we updated the controller, let's test the controller logic by simulating the call.
import { createRole, updateRole } from '../controllers/privileges.js';

const verifyFix = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Test case-insensitive creation
    console.log('\n🧪 Testing Case-Insensitive Creation...');
    const mockRes = {
      status: function(s) { this.statusCode = s; return this; },
      json: function(j) { this.body = j; return this; }
    };
    const mockReq = {
      body: { name: 'ARCHITECT' }, // Already exists as 'architect'
      user: { userId: '123' }
    };
    const next = (err) => { if (err) console.error('Next error:', err); };

    await createRole(mockReq, mockRes, next);

    if (mockRes.statusCode === 400 && mockRes.body.message === 'A role with this name already exists') {
      console.log('✅ SUCCESS: Correctly blocked duplicate role name "ARCHITECT"');
    } else {
      console.error('❌ FAILURE: Failed to block duplicate role name "ARCHITECT"', mockRes.statusCode, mockRes.body);
    }

    // 2. Test case-insensitive update
    console.log('\n🧪 Testing Case-Insensitive Update...');
    const customRole = await Role.findOne({ isSystem: false });
    if (!customRole) {
      console.error('❌ FAILURE: No custom role found for update test');
    } else {
      const mockUpdateReq = {
        params: { id: customRole._id.toString() },
        body: { name: 'ARCHITECT' }, // Try to rename custom role to 'ARCHITECT' (existing)
        user: { userId: '123' }
      };
      const mockUpdateRes = {
        status: function(s) { this.statusCode = s; return this; },
        json: function(j) { this.body = j; return this; }
      };

      await updateRole(mockUpdateReq, mockUpdateRes, next);

      if (mockUpdateRes.statusCode === 400 && mockUpdateRes.body.message === 'A role with this name already exists') {
        console.log('✅ SUCCESS: Correctly blocked renaming "sales" to existing name "ARCHITECT"');
      } else {
        console.error('❌ FAILURE: Failed to block renaming to existing name "ARCHITECT"', mockUpdateRes.statusCode, mockUpdateRes.body);
      }
    }

    console.log('\n🎉 Verification complete!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  }
};

verifyFix();
