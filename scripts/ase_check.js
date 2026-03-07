import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });
await mongoose.connect(process.env.MONGO_URI);

const results = [];
for (const mid of ['SVS000040', 'SVS000041', 'SVS000075']) {
    const u = await User.findOne({ memberId: mid }).lean();
    const f = await UserFinance.findOne({ user: u._id }).select('leftLegBV rightLegBV thisMonthLeftLegBV thisMonthRightLegBV').lean();
    results.push({
        member: mid,
        name: u.fullName,
        personalBV: u.personalBV,
        leftChild: u.leftChild ? (await User.findById(u.leftChild).select('memberId').lean())?.memberId : null,
        rightChild: u.rightChild ? (await User.findById(u.rightChild).select('memberId').lean())?.memberId : null,
        finance: { llbv: f?.leftLegBV, rlbv: f?.rightLegBV, tmlbv: f?.thisMonthLeftLegBV, tmrbv: f?.thisMonthRightLegBV }
    });
}

fs.writeFileSync(path.join(__dirname, 'ase_check.json'), JSON.stringify(results, null, 2));
console.log('Done');
process.exit(0);
