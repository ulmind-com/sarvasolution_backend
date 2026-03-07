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

// Check counts by type
const counts = await BVTransaction.aggregate([
    { $group: { _id: '$transactionType', count: { $sum: 1 }, totalBV: { $sum: '$bvAmount' } } }
]);
const summary = counts.map(c => `${c._id}:count=${c.count},total=${c.totalBV}`).join(' | ');
process.stdout.write('TYPES: ' + summary + '\n');

// Check Adil's transactions specifically
const adil = await User.findOne({ memberId: 'SVS000002' }).lean();
const adilTxns = await BVTransaction.find({ userId: adil._id }).lean();
process.stdout.write(`ADIL txns: count=${adilTxns.length}\n`);
adilTxns.forEach(t => process.stdout.write(`  ${t.transactionType}|bv=${t.bvAmount}|leg=${t.legAffected}\n`));

process.exit(0);
