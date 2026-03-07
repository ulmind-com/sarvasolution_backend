import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import BVTransaction from '../src/models/BVTransaction.model.js';
import User from '../src/models/User.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_URI);

// Check how many transactions have fromUserId set
const withFrom = await BVTransaction.countDocuments({ fromUserId: { $exists: true, $ne: null } });
const totalTxns = await BVTransaction.countDocuments();
process.stdout.write(`Total txns=${totalTxns}, with fromUserId=${withFrom}\n`);

// Get all buyers this month
const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const monthlyBuyers = await BVTransaction.aggregate([
    { $match: { fromUserId: { $exists: true, $ne: null }, createdAt: { $gte: startOfMonth } } },
    { $group: { _id: { buyer: '$fromUserId', ref: '$referenceId', bv: '$bvAmount' } } },
    { $group: { _id: '$_id.buyer', totalBV: { $sum: '$_id.bv' } } }
]);
process.stdout.write(`Monthly buyers this month count=${monthlyBuyers.length}\n`);
for (const b of monthlyBuyers.slice(0, 3)) {
    const u = await User.findById(b._id).select('memberId').lean();
    process.stdout.write(`  buyer=${u?.memberId}, totalBV=${b.totalBV}\n`);
}

// Also check personalBV of Adil (SVS000002)
const adil = await User.findOne({ memberId: 'SVS000002' }).select('personalBV').lean();
process.stdout.write(`ADIL personalBV=${adil?.personalBV}\n`);

// Look at raw first 3 transactions
const first3 = await BVTransaction.find({}).limit(3).lean();
first3.forEach(t => process.stdout.write(`txn: from=${t.fromUserId}, bvAmount=${t.bvAmount}, leg=${t.legAffected}, type=${t.transactionType}\n`));

process.exit(0);
