import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_URI);

// Print all values for these users  
const memberIds = ['SVS000001', 'SVS000012', 'SVS000002', 'SVS000005'];
for (const memberId of memberIds) {
    const u = await User.findOne({ memberId }).lean();
    const f = await UserFinance.findOne({ user: u._id }).select('thisMonthLeftLegBV thisMonthRightLegBV leftLegBV rightLegBV').lean();
    process.stdout.write(`\n${memberId} (pos=${u.position}, parent=${u.parentId}):\n`);
    process.stdout.write(`  Finance: llbv=${f?.leftLegBV} rlbv=${f?.rightLegBV} tmlbv=${f?.thisMonthLeftLegBV} tmrbv=${f?.thisMonthRightLegBV}\n`);
}

process.exit(0);
