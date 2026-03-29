import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import { UserPermission } from './models/UserPermission.js';
import { authenticateJWT } from './middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function diagnose() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // Get a user to test with
        const user = await User.findOne({ email: 'admin@maruti.com' }).lean();
        if (!user) throw new Error('User not found');

        const token = jwt.sign({ userId: user._id, companyId: user.companyId }, process.env.JWT_SECRET);
        console.log('Testing with token for user:', user.email);

        const req = {
            headers: { authorization: `Bearer ${token}` },
            socket: { remoteAddress: '127.0.0.1' }
        };
        const res = {
            status: function(s) { 
                console.log('Response Status:', s); 
                return { json: (j) => console.log('Response JSON:', j) };
            }
        };
        const next = (err) => {
            if (err) {
                console.error('Next called with error:', err);
                console.error('Error Stack:', err.stack);
            } else {
                console.log('Next called without error');
            }
        };

        await authenticateJWT(req, res, next);
        
        process.exit(0);
    } catch (err) {
        console.error('Diagnostic failed:', err);
        process.exit(1);
    }
}

diagnose();
