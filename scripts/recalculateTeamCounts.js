import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.model.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

/**
 * Recursive function to calculate downline counts
 * Returns the total count of the subtree (including itself)
 */
const processNode = async (userId) => {
    if (!userId) return 0;

    const user = await User.findById(userId);
    if (!user) return 0;

    // Recursively count left and right subtrees
    const leftCount = user.leftChild ? await processNode(user.leftChild) : 0;
    const rightCount = user.rightChild ? await processNode(user.rightChild) : 0;

    // Update the user with calculated counts
    user.leftTeamCount = leftCount;
    user.rightTeamCount = rightCount;

    await user.save();

    console.log(`Updated ${user.memberId}: Left=${leftCount}, Right=${rightCount}`);

    // Return total count (1 for self + left + right)
    return 1 + leftCount + rightCount;
};

const runScript = async () => {
    await connectDB();

    console.log('Starting Team Count Recalculation...');

    try {
        // Find the root user (usually SVS000001 or user with no parentId)
        // Adjust this finding logic if you have multiple roots, but typically MLM has one root.
        const rootUser = await User.findOne({ memberId: 'SVS000001' });

        if (!rootUser) {
            console.error('Root user (SVS000001) not found! Attempting to find top-level nodes...');
            const topLevelUsers = await User.find({ parentId: null });

            for (const topUser of topLevelUsers) {
                console.log(`Processing tree starting from ${topUser.memberId}...`);
                await processNode(topUser._id);
            }
        } else {
            console.log(`Found root user: ${rootUser.memberId}`);
            await processNode(rootUser._id);
        }

        console.log('Recalculation Complete! 🚀');
        process.exit(0);

    } catch (error) {
        console.error('Script Failed:', error);
        process.exit(1);
    }
};

runScript();
