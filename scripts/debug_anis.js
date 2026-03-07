import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '__dirname'.replace('__dirname', '..') + '/.env') });

dotenv.config({ path: path.join(__dirname, '../.env') });
await mongoose.connect(process.env.MONGO_URI);

// Check Anis's direct left child
const anis = await User.findOne({ memberId: 'SVS000012' }).lean();
process.stdout.write(`ANIS leftChild=${anis.leftChild}, rightChild=${anis.rightChild}\n`);

// Resolve leftChild ObjectId to User
const leftChildUser = anis.leftChild ? await User.findById(anis.leftChild).select('memberId personalBV thisMonthBV leftChild rightChild').lean() : null;
process.stdout.write(`ANIS direct leftChild: ${leftChildUser?.memberId} pBV=${leftChildUser?.personalBV} tmbv=${leftChildUser?.thisMonthBV}\n`);
process.stdout.write(`  leftChild has leftChild=${leftChildUser?.leftChild}, rightChild=${leftChildUser?.rightChild}\n`);

if (leftChildUser?.leftChild) {
    const grandChild = await User.findById(leftChildUser.leftChild).select('memberId personalBV thisMonthBV').lean();
    process.stdout.write(`  grandChild: ${grandChild?.memberId} pBV=${grandChild?.personalBV}\n`);
}

// Test recursive computation on anis
const allUsers = await User.find({}).lean();
const userMap = new Map();
allUsers.forEach(u => userMap.set(u._id.toString(), u));

const lifetimeCache = new Map();
const computeLifetime = (userId) => {
    if (!userId) return 0;
    const strId = userId.toString();
    if (lifetimeCache.has(strId)) return lifetimeCache.get(strId);
    const user = userMap.get(strId);
    if (!user) { process.stdout.write(`  NOT IN MAP: ${strId}\n`); return 0; }
    const pBV = user.personalBV || 0;
    const l = computeLifetime(user.leftChild);
    const r = computeLifetime(user.rightChild);
    lifetimeCache.set(strId, pBV + l + r);
    return pBV + l + r;
};

if (anis.leftChild) {
    const leftLifetime = computeLifetime(anis.leftChild);
    process.stdout.write(`Recursive leftLifetimeBV for Anis: ${leftLifetime}\n`);
}

process.exit(0);
