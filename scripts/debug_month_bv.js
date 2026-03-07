import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_URI);

// Get users with non-zero thisMonthBV to see if leaf-level only
const users = await User.find({ thisMonthBV: { $gt: 0 } }).select('memberId thisMonthBV personalBV leftChild rightChild status').limit(10).lean();
users.forEach(u => process.stdout.write(`${u.memberId}|tmbv=${u.thisMonthBV}|pBV=${u.personalBV}|hasLeft=${u.leftChild ? 1 : 0}|hasRight=${u.rightChild ? 1 : 0}|status=${u.status}\n`));

process.exit(0);
