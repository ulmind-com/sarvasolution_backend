import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_URI);

// Check Super's leftChild and rightChild
const superUser = await User.findOne({ memberId: 'SVS000001' }).select('memberId leftChild rightChild leftLegBV rightLegBV thisMonthLeftLegBV thisMonthRightLegBV').lean();
process.stdout.write(`SUPER: leftChild=${superUser?.leftChild}, rightChild=${superUser?.rightChild}\n`);
process.stdout.write(`SUPER: leftLegBV=${superUser?.leftLegBV}, rightLegBV=${superUser?.rightLegBV}\n`);
process.stdout.write(`SUPER: thisMonthLeftLegBV=${superUser?.thisMonthLeftLegBV}, thisMonthRightLegBV=${superUser?.thisMonthRightLegBV}\n`);

// Check if the leftChild ID matches any user
if (superUser?.leftChild) {
    const leftChildUser = await User.findById(superUser.leftChild).select('memberId personalBV').lean();
    process.stdout.write(`SUPER leftChild resolved: ${leftChildUser?.memberId}, personalBV=${leftChildUser?.personalBV}\n`);
}

// Test the sync computation manually for super
const allUsers = await User.find({}).lean();
const userMap = new Map();
allUsers.forEach(u => userMap.set(u._id.toString(), u));

const getLifetimeBV = (userId) => {
    if (!userId) return 0;
    const strId = userId.toString();
    const user = userMap.get(strId);
    if (!user) {
        process.stdout.write(`  NOT FOUND: userId=${strId}\n`);
        return 0;
    }
    const personalBV = user.personalBV || 0;
    const left = getLifetimeBV(user.leftChild);
    const right = getLifetimeBV(user.rightChild);
    return personalBV + left + right;
};

const superLeftBV = getLifetimeBV(superUser?.leftChild);
const superRightBV = getLifetimeBV(superUser?.rightChild);
process.stdout.write(`Computed: SUPER leftLifetimeBV=${superLeftBV}, rightLifetimeBV=${superRightBV}\n`);

process.exit(0);
