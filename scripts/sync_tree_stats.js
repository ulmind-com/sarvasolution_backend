import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(chalk.green(`MongoDB Connected: ${conn.connection.host}`));
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const runScript = async () => {
    await connectDB();
    console.log(chalk.blue('Starting Tree Statistics Sync...'));

    try {
        const allUsers = await User.find({}).lean();
        const allFinances = await UserFinance.find({}).lean();

        const userMap = new Map();
        const financeMap = new Map();
        allUsers.forEach(u => userMap.set(u._id.toString(), u));
        allFinances.forEach(f => financeMap.set(f.user.toString(), f));

        // ========================================
        // SIMPLE RECURSIVE FUNCTIONS
        // ========================================
        // Each user's OWN BV = personalBV (set only at activation/purchase, NOT accumulated from downline)
        // Left leg total = sum of personalBV of ALL users in the left subtree (recursively)
        // Right leg total = sum of personalBV of ALL users in the right subtree (recursively)

        const teamStatsCache = new Map();
        const subtreeBVCache = new Map();

        // 1. Team Active/Inactive counts (recursive)
        const getTeamStats = (userId) => {
            if (!userId) return { count: 0, active: 0, inactive: 0 };
            const strId = userId.toString();
            if (teamStatsCache.has(strId)) return teamStatsCache.get(strId);

            const user = userMap.get(strId);
            if (!user) return { count: 0, active: 0, inactive: 0 };

            const left = getTeamStats(user.leftChild);
            const right = getTeamStats(user.rightChild);
            const isActive = user.status === 'active';

            const stats = {
                count: 1 + left.count + right.count,
                active: (isActive ? 1 : 0) + left.active + right.active,
                inactive: (!isActive ? 1 : 0) + left.inactive + right.inactive
            };
            teamStatsCache.set(strId, stats);
            return stats;
        };

        // 2. Total BV of entire subtree rooted at userId
        //    = this user's personalBV + left subtree BV + right subtree BV
        const getSubtreeBV = (userId) => {
            if (!userId) return 0;
            const strId = userId.toString();
            if (subtreeBVCache.has(strId)) return subtreeBVCache.get(strId);

            const user = userMap.get(strId);
            if (!user) return 0;

            // personalBV = this user's OWN purchases only (not accumulated from children)
            const myBV = user.personalBV || 0;
            const leftBV = getSubtreeBV(user.leftChild);
            const rightBV = getSubtreeBV(user.rightChild);

            const total = myBV + leftBV + rightBV;
            subtreeBVCache.set(strId, total);
            return total;
        };

        // ========================================
        // COMPUTE & UPDATE
        // ========================================
        const updates = [];
        const financeUpdates = [];

        for (const user of allUsers) {
            const leftStats = getTeamStats(user.leftChild);
            const rightStats = getTeamStats(user.rightChild);

            // Left leg BV = total personalBV of all users in left subtree
            const leftLegBV = getSubtreeBV(user.leftChild);
            // Right leg BV = total personalBV of all users in right subtree
            const rightLegBV = getSubtreeBV(user.rightChild);

            // Since all purchases are from the current operational period (no month reset yet),
            // thisMonth values = lifetime values for now
            updates.push({
                updateOne: {
                    filter: { _id: user._id },
                    update: {
                        leftTeamCount: leftStats.count,
                        leftTeamActive: leftStats.active,
                        leftTeamInactive: leftStats.inactive,
                        rightTeamCount: rightStats.count,
                        rightTeamActive: rightStats.active,
                        rightTeamInactive: rightStats.inactive,
                        leftLegBV: leftLegBV,
                        rightLegBV: rightLegBV,
                        thisMonthLeftLegBV: leftLegBV,
                        thisMonthRightLegBV: rightLegBV
                    }
                }
            });

            const finance = financeMap.get(user._id.toString());
            if (finance) {
                financeUpdates.push({
                    updateOne: {
                        filter: { _id: finance._id },
                        update: {
                            leftLegBV: leftLegBV,
                            rightLegBV: rightLegBV,
                            thisMonthLeftLegBV: leftLegBV,
                            thisMonthRightLegBV: rightLegBV
                        }
                    }
                });
            }
        }

        console.log(chalk.blue(`Applying ${updates.length} User updates...`));
        if (updates.length > 0) await User.bulkWrite(updates);

        console.log(chalk.blue(`Applying ${financeUpdates.length} UserFinance updates...`));
        if (financeUpdates.length > 0) await UserFinance.bulkWrite(financeUpdates);

        console.log(chalk.green('Tree Statistics Sync Complete!'));
        process.exit(0);

    } catch (e) {
        console.error(chalk.red('Sync Failed:'), e);
        process.exit(1);
    }
};

runScript();
