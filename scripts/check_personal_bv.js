import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_URI);

// Check all users with non-zero selfPurchase.thisMonthBV or personalBV
const users = await User.find({ $or: [{ 'selfPurchase.thisMonthBV': { $gt: 0 } }, { personalBV: { $gt: 0 } }] })
    .select('memberId personalBV selfPurchase.thisMonthBV thisMonthBV status').lean();
process.stdout.write(`Users with BV data: count=${users.length}\n`);
users.forEach(u => {
    process.stdout.write(`${u.memberId}: personalBV=${u.personalBV}, selfPurchase.thisMonthBV=${u?.selfPurchase?.thisMonthBV}, thisMonthBV=${u.thisMonthBV}, status=${u.status}\n`);
});

process.exit(0);
