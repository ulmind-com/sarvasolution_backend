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

    if (user.memberId === 'SVS000004') {
        console.log(`DEBUG: Processing SVS000004. Sponsor: ${sponsor.memberId}`);
        console.log(`DEBUG: Parent: ${user.parentId}`);
        console.log(`DEBUG: Sponsor LeftChild: ${sponsor.leftChild}`);
        console.log(`DEBUG: User ID: ${user._id}`);
    }

    const isActive = user.status === 'active';

    // Helper to update fields
    const updateStats = async (targetSponsor, isLeft) => {
        if (isLeft) {
            if (isActive) targetSponsor.leftDirectActive += 1;
            else targetSponsor.leftDirectInactive += 1;
        } else {
            if (isActive) targetSponsor.rightDirectActive += 1;
            else targetSponsor.rightDirectInactive += 1;
        }
        await targetSponsor.save();
    };

    // Check direct parent
    if (sponsor.memberId === user.parentId) {
        if (sponsor.leftChild && sponsor.leftChild.toString() === user._id.toString()) {
            await updateStats(sponsor, true);
        } else if (sponsor.rightChild && sponsor.rightChild.toString() === user._id.toString()) {
            await updateStats(sponsor, false);
        }
        return;
    }

    // Traverse up to find leg
    let iterator = await User.findOne({ memberId: user.parentId });
    while (iterator) {
        if (iterator.memberId === sponsor.memberId) break;
        if (!iterator.parentId) break;
        iterator = await User.findOne({ memberId: iterator.parentId });
    }

    // Reliable Ancestor Check
    if (sponsor.leftChild) {
        const isLeft = await isAncestor(sponsor.leftChild, user._id);
        if (isLeft) {
            await updateStats(sponsor, true);
            return;
        }
    }
    if (sponsor.rightChild) {
        const isRight = await isAncestor(sponsor.rightChild, user._id);
        if (isRight) {
            await updateStats(sponsor, false);
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
    console.log('Starting Sponsor Direct Count Recalculation (Active/Inactive)...');

    // Reset all
    console.log('Resetting counts...');
    await User.updateMany({}, {
        leftDirectActive: 0,
        leftDirectInactive: 0,
        rightDirectActive: 0,
        rightDirectInactive: 0,
        $unset: { leftDirectSponsors: "", rightDirectSponsors: "" }
    });

    const allUsers = await User.find({}).select('memberId parentId sponsorId status');
    console.log(`Processing ${allUsers.length} users...`);

    let count = 0;
    for (const user of allUsers) {
        await processUser(user);
        count++;
        if (count % 50 === 0) process.stdout.write('.');
    }
    console.log('\nDone!');
    process.exit(0);
};

runScriptReal();
