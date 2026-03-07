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

// CHECK SUPER
const super_user = await User.findOne({ memberId: 'SVS000001' }).lean();
const super_fin = await UserFinance.findOne({ user: super_user._id }).select('thisMonthBV thisMonthLeftLegBV thisMonthRightLegBV leftLegBV rightLegBV personalBV').lean();
console.log('SUPER Finance:', JSON.stringify(super_fin));

// Find Adil (second user)
const adil = await User.findOne({ memberId: 'SVS000002' }).lean();
const adil_fin = await UserFinance.findOne({ user: adil._id }).select('thisMonthBV thisMonthLeftLegBV thisMonthRightLegBV leftLegBV rightLegBV personalBV').lean();
console.log('ADIL Finance:', JSON.stringify(adil_fin));

// Check all users who have non-zero thisMonthBV
const nonZero = await UserFinance.find({ thisMonthBV: { $gt: 0 } }).select('memberId thisMonthBV leftLegBV rightLegBV').limit(10).lean();
console.log('Non-zero thisMonthBV users:', JSON.stringify(nonZero, null, 2));

process.exit(0);
