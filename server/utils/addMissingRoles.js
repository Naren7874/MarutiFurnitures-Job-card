/**
 * Add Missing Roles Script — Add 'Architecture', 'Project Designer', etc. to Furnituno
 * Usage: node utils/addMissingRoles.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

import { Role } from '../models/Role.js';

const NEW_ROLES = [
  {
    name: "Architecture",
    isSystem: false,
    permissions: ["client.view", "quotation.view", "project.view", "jobcard.view"],
    dataScope: "all",
    isActive: true
  },
  {
    name: "Project Designer",
    isSystem: false,
    permissions: ["client.view", "quotation.view", "project.view", "jobcard.view"],
    dataScope: "all",
    isActive: true
  },
  {
    name: "Factory Manager",
    isSystem: false,
    permissions: ["jobcard.view", "productionStage.view", "productionStage.edit", "qcStage.view", "qcStage.edit", "dispatchStage.view", "dispatchStage.edit"],
    dataScope: "all",
    isActive: true
  },
  {
    name: "company moniter",
    isSystem: false,
    permissions: ["client.view", "quotation.view", "project.view", "jobcard.view", "invoice.view", "report.view"],
    dataScope: "all",
    isActive: true
  }
];

const main = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const furnitunoId = '69b55721bf2adac084fef796'; // From previous tool output
        
        console.log(`🚀 Adding ${NEW_ROLES.length} new roles to Furnituno...`);

        for (const roleData of NEW_ROLES) {
            await Role.updateOne(
                { companyId: furnitunoId, name: roleData.name },
                { ...roleData, companyId: furnitunoId },
                { upsert: true }
            );
            console.log(`   ✅ Role added/updated: ${roleData.name}`);
        }

        console.log('\n🎉 Roles successfully added to Furnituno!');
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to add roles:', err);
        process.exit(1);
    }
};

main();
