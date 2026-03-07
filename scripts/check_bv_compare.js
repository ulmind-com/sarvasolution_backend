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

// Check users with active status and what their thisMonthBV is in BOTH models
const users = await User.find({ status: 'active' }).select('memberId thisMonthBV personalBV totalBV').limit(5).lean();
for (const u of users) {
    const fin = await UserFinance.findOne({ user: u._id }).select('thisMonthBV personalBV totalBV').lean();
    console.log(`${u.memberId}: User.thisMonthBV=${u.thisMonthBV}, Finance.thisMonthBV=${fin?.thisMonthBV}, User.personalBV=${u.personalBV}, Finance.personalBV=${fin?.personalBV}`);
}

process.exit(0);
