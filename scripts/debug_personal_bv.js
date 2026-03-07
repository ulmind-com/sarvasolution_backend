import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_URI);

// 1. How many users have personalBV > 0?
const usersWithPersonalBV = await User.countDocuments({ personalBV: { $gt: 0 } });
const totalUsers = await User.countDocuments();
process.stdout.write(`Users with personalBV>0: ${usersWithPersonalBV}/${totalUsers}\n`);

// 2. Top 5 users by personalBV
const topBV = await User.find({ personalBV: { $gt: 0 } }).sort({ personalBV: -1 }).select('memberId personalBV status leftChild rightChild parentId position').limit(5).lean();
topBV.forEach(u => process.stdout.write(`${u.memberId}: personalBV=${u.personalBV}, pos=${u.position}, parent=${u.parentId}\n`));

// 3. Check Anis specifically
const anis = await User.findOne({ memberId: 'SVS000012' }).select('personalBV leftChild rightChild leftLegBV rightLegBV leftTeamActive leftTeamInactive').lean();
process.stdout.write(`ANIS: personalBV=${anis?.personalBV}, leftLegBV=${anis?.leftLegBV}, rightLegBV=${anis?.rightLegBV}, leftChild=${anis?.leftChild}, rightChild=${anis?.rightChild}\n`);

// 4. Check who is in Anis's left subtree - look at first 10 children
const anisChildren = await User.find({ parentId: 'SVS000012' }).select('memberId position personalBV status').lean();
process.stdout.write(`Anis direct children: ${anisChildren.length}\n`);
anisChildren.forEach(c => process.stdout.write(`  ${c.memberId}: pos=${c.position}, personalBV=${c.personalBV}\n`));

process.exit(0);
