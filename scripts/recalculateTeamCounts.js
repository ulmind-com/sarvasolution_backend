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

const runScript = async () => {
    await connectDB();
    console.log('Starting Sponsor Direct Count Recalculation...');

    try {
        // 1. Reset all counts
        console.log('Resetting counts to 0...');
        await User.updateMany({}, {
            leftDirectSponsors: 0,
            rightDirectSponsors: 0,
            $unset: { leftTeamCount: "", rightTeamCount: "" } // Cleanup old fields
        });

        const allUsers = await User.find({}).select('memberId sponsorId parentId');
        console.log(`Processing ${allUsers.length} users...`);

        for (const user of allUsers) {
            if (!user.sponsorId || !user.parentId) continue;

            const sponsor = await User.findOne({ memberId: user.sponsorId });
            if (!sponsor) continue;

            // Determine leg: Traverse up from user.parentId until we hit sponsor
            let iteratorId = user.parentId;

            // Optimization: First check immediate children of sponsor
            if (sponsor.leftChild && (await User.findById(sponsor.leftChild))?.memberId === user.memberId) {
                // Cannot happen because user.memberId != user.parentId. 
                // We need to check if sponsor.leftChild === user.parentId? No.
                // We need to check if sponsor.leftChild is the ancestor of user.
            }

            // Just traversal
            // Warning: deeply nested trees make this slow. 
            // Better: Load needed fields for all users into memory for fast lookup
        }

        // --- In-Memory Optimization ---
        const userMap = new Map();
        const usersFull = await User.find({}).select('_id memberId parentId leftChild rightChild leftDirectSponsors rightDirectSponsors');
        usersFull.forEach(u => userMap.set(u.memberId, u));

        let updates = 0;

        for (const user of usersFull) {
            if (!user.sponsorId) continue; // Root or anomaly

            // Find sponsor in map
            // Note: user.sponsorId is a String, userMap keys are memberIds (String)
            // But wait, the previous `find` didn't select sponsorId.
        }
    } catch (e) { console.error(e) }
};
// Scratch that, let's stick to the reliable database traversal for correctness over speed for this admin script.
// Using the same logic as the service ensures consistency.

const processUser = async (user) => {
    if (!user.sponsorId || !user.parentId) return;

    const sponsor = await User.findOne({ memberId: user.sponsorId });
    if (!sponsor) return;

    let iterator = await User.findOne({ memberId: user.parentId });
    let isFound = false;

    // Check if user is direct child of sponsor (Optimization)
    if (sponsor.memberId === user.parentId) {
        // User's parent IS the sponsor
        if (sponsor.leftChild && sponsor.leftChild.toString() === user._id.toString()) {
            sponsor.leftDirectSponsors += 1;
        } else if (sponsor.rightChild && sponsor.rightChild.toString() === user._id.toString()) {
            sponsor.rightDirectSponsors += 1;
        }
        await sponsor.save();
        return;
    }

    // Traverse up
    while (iterator) {
        if (iterator.memberId === sponsor.memberId) {
            isFound = true;
            break;
        }
        if (!iterator.parentId) break;

        // We need to know which child we came from to identify the leg *relative to the sponsor*
        // The loop finds the sponsor. But we need to know: Did we reach sponsor from sponsor.left or sponsor.right?
        // So we need to look *down* from sponsor, or track the path.

        iterator = await User.findOne({ memberId: iterator.parentId });
    }

    // Re-approach: Find the Child of Sponsor that is an ancestor of User.
    if (sponsor.leftChild) {
        const isLeft = await isAncestor(sponsor.leftChild, user._id);
        if (isLeft) {
            sponsor.leftDirectSponsors += 1;
            await sponsor.save();
            return;
        }
    }
    if (sponsor.rightChild) {
        const isRight = await isAncestor(sponsor.rightChild, user._id);
        if (isRight) {
            sponsor.rightDirectSponsors += 1;
            await sponsor.save();
            return;
        }
    }
};

// Helper: BFS/DFS to check if 'ancestorId' is actually an ancestor of 'targetId'
// Or simpler: Check if targetId is in the subtree of startNodeId
const isAncestor = async (startNodeId, targetId) => {
    // DFS
    const stack = [startNodeId];
    while (stack.length > 0) {
        const currentId = stack.pop();
        if (currentId.toString() === targetId.toString()) return true;

        const node = await User.findById(currentId).select('leftChild rightChild');
        if (node) {
            if (node.leftChild) stack.push(node.leftChild);
            if (node.rightChild) stack.push(node.rightChild);
        }
    }
    return false;
};

const runScriptReal = async () => {
    await connectDB();
    console.log('Starting SCRIPT...');

    await User.updateMany({}, {
        leftDirectSponsors: 0,
        rightDirectSponsors: 0,
        $unset: { leftTeamCount: "", rightTeamCount: "" }
    });

    const allUsers = await User.find({});
    console.log(`Processing ${allUsers.length} users...`);

    let count = 0;
    for (const user of allUsers) {
        await processUser(user);
        count++;
        if (count % 10 === 0) process.stdout.write('.');
    }
    console.log('\nDone!');
    process.exit(0);
};

runScriptReal();
