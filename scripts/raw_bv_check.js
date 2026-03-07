import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_URI);

// Get raw BVTransaction document to see all fields
const db = mongoose.connection.db;
const col = db.collection('bvtransactions');
const samples = await col.find({}).limit(3).toArray();
process.stdout.write('RAW BVTxn fields:\n');
samples.forEach(t => process.stdout.write(JSON.stringify(t) + '\n'));

process.exit(0);
