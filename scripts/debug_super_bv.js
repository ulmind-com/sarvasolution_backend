import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_URI);

// Check Super and first few members under them
const superUser = await User.findOne({ memberId: 'SVS000001' }).select('memberId status thisMonthBV thisMonthLeftLegBV thisMonthRightLegBV leftLegBV rightLegBV leftTeamActive leftTeamInactive').lean();
console.log('SUPER:', JSON.stringify(superUser));

const adil = await User.findOne({ memberId: 'SVS000002' }).select('memberId status thisMonthBV parentId position leftLegBV rightLegBV').lean();
console.log('ADIL:', JSON.stringify(adil));

// Also find who are children of Super
const childrenOfSuper = await User.find({ parentId: 'SVS000001' }).select('memberId position thisMonthBV leftLegBV rightLegBV').lean();
console.log('Children of Super:', JSON.stringify(childrenOfSuper));

process.exit(0);
