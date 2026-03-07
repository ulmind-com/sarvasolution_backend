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

const members = ['SVS000001', 'SVS000012', 'SVS000002', 'SVS000005', 'SVS000038'];
const results = [];
for (const memberId of members) {
    const u = await User.findOne({ memberId }).lean();
    if (!u) continue;
    const f = await UserFinance.findOne({ user: u._id }).select('thisMonthLeftLegBV thisMonthRightLegBV leftLegBV rightLegBV personalBV').lean();
    results.push({
        member: memberId,
        name: u.fullName,
        position: u.position,
        parent: u.parentId,
        personalBV: u.personalBV,
        lifetime: { left: f?.leftLegBV, right: f?.rightLegBV },
        thisMonth: { left: f?.thisMonthLeftLegBV, right: f?.thisMonthRightLegBV }
    });
}

fs.writeFileSync(path.join(__dirname, 'bv_results.json'), JSON.stringify(results, null, 2));
console.log('Done');
process.exit(0);
