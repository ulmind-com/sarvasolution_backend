import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';
import chalk from 'chalk';

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

const syncDatabase = async () => {
    await connectDB();
    console.log(chalk.blue('Starting Database Synchronization...'));

    try {
        const finances = await UserFinance.find({});
        console.log(`Found ${finances.length} finance records.`);

        let updatedCount = 0;

        for (const finance of finances) {
            let userUpdates = false;

            // 1. Initialize Fast Track
            if (!finance.fastTrack) {
                console.log(chalk.yellow(`Initializing Fast Track for ${finance.memberId}`));
                finance.fastTrack = {
                    dailyClosings: 0,
                    pendingPairLeft: 0,
                    pendingPairRight: 0,
                    carryForwardLeft: 0,
                    carryForwardRight: 0,
                    closingHistory: []
                };
                userUpdates = true;
            }

            // 2. Initialize Star Matching Bonus & Counter
            if (!finance.starMatchingBonus) {
                console.log(chalk.yellow(`Initializing Star Matching for ${finance.memberId}`));
                finance.starMatchingBonus = {
                    dailyClosings: 0,
                    pendingStarsLeft: 0,
                    pendingStarsRight: 0,
                    carryForwardStarsLeft: 0,
                    carryForwardStarsRight: 0,
                    closingHistory: []
                };
                userUpdates = true;
            }

            if (finance.starMatching === undefined) {
                finance.starMatching = 0;
                userUpdates = true;
            }

            // 3. Ensure Rank History exists
            if (!finance.rankHistory) {
                finance.rankHistory = [];
                userUpdates = true;
            }

            if (userUpdates) {
                await finance.save();
                updatedCount++;
            }
        }

        console.log(chalk.green(`Synchronization Complete. Updated ${updatedCount} records.`));

    } catch (e) {
        console.error(chalk.red('Sync Failed:'), e);
    }
    process.exit(0);
};

syncDatabase();
