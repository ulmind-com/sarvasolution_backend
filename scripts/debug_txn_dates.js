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

// Print first 5 transaction dates to understand what month purchases were made
const txns = await BVTransaction.find({ fromUserId: { $exists: true, $ne: null } })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();
process.stdout.write(`Now: ${new Date().toISOString()}\n`);
txns.forEach(t => process.stdout.write(`txn createdAt=${t.createdAt?.toISOString()}, bvAmount=${t.bvAmount}\n`));

// Get the month range that covers most transactions
const monthDistribution = await BVTransaction.aggregate([
    { $match: { fromUserId: { $exists: true, $ne: null } } },
    {
        $group: {
            _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
        }
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } }
]);
process.stdout.write('Transaction distribution by month:\n');
monthDistribution.forEach(d => process.stdout.write(`  ${d._id.year}/${d._id.month}: ${d.count} txns\n`));

// Also find Adil and check when they joined/purchased
const adil = await User.findOne({ memberId: 'SVS000002' }).select('memberId personalBV createdAt thisMonthBV').lean();
process.stdout.write(`ADIL: personalBV=${adil?.personalBV}, thisMonthBV=${adil?.thisMonthBV}, createdAt=${adil?.createdAt?.toISOString()}\n`);

process.exit(0);
