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

// Check SVS000075 and SVS000041 - recent purchases
const results = {};
for (const mid of ['SVS000075', 'SVS000041']) {
    const u = await User.findOne({ memberId: mid }).lean();
    if (!u) { results[mid] = 'NOT FOUND'; continue; }
    const f = await UserFinance.findOne({ user: u._id }).select('personalBV thisMonthBV leftLegBV rightLegBV thisMonthLeftLegBV thisMonthRightLegBV').lean();

    // Trace path to root
    const pathToRoot = [];
    let current = u;
    while (current.parentId) {
        pathToRoot.push({ member: current.memberId, position: current.position, parent: current.parentId });
        current = await User.findOne({ memberId: current.parentId }).lean();
        if (!current) break;
    }
    if (current) pathToRoot.push({ member: current.memberId, position: current.position || 'root' });

    results[mid] = {
        personalBV: u.personalBV,
        thisMonthBV: u.thisMonthBV,
        finance: {
            personalBV: f?.personalBV,
            thisMonthBV: f?.thisMonthBV,
            leftLegBV: f?.leftLegBV,
            rightLegBV: f?.rightLegBV,
            thisMonthLeftLegBV: f?.thisMonthLeftLegBV,
            thisMonthRightLegBV: f?.thisMonthRightLegBV
        },
        pathToRoot
    };
}

// Also check Super's current state
const superUser = await User.findOne({ memberId: 'SVS000001' }).lean();
const superFin = await UserFinance.findOne({ user: superUser._id }).select('leftLegBV rightLegBV thisMonthLeftLegBV thisMonthRightLegBV').lean();
results['SVS000001_SUPER'] = {
    leftLegBV: superFin?.leftLegBV,
    rightLegBV: superFin?.rightLegBV,
    thisMonthLeftLegBV: superFin?.thisMonthLeftLegBV,
    thisMonthRightLegBV: superFin?.thisMonthRightLegBV
};

fs.writeFileSync(path.join(__dirname, 'debug_output.json'), JSON.stringify(results, null, 2));
console.log('Done');
process.exit(0);
