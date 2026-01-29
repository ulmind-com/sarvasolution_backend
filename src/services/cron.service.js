import cron from 'node-cron';
import User from '../models/User.model.js';
import { mlmService } from './mlm.service.js';
import { bonusService } from './bonus.service.js';
import chalk from 'chalk';

/**
 * Initialize all automated tasks
 */
export const initCrons = () => {
    // 1. Weekly Closings (Friday 11 AM IST)
    // '0 11 * * 5'
    cron.schedule('0 11 * * 5', async () => {
        console.log(chalk.blue('Starting Weekly Payout Processing...'));
        try {
            const users = await User.find({ status: 'active' });
            for (const user of users) {
                await mlmService.calculateBinaryMatching(user._id);
            }
            console.log(chalk.green('Weekly Payouts completed successfully.'));
        } catch (error) {
            console.error(chalk.red('Weekly Payout Error:'), error);
        }
    });

    // 2. Monthly Closings (1st of every month at midnight)
    cron.schedule('0 0 1 * *', async () => {
        console.log(chalk.blue('Starting Monthly Reset and Fund Processing...'));
        try {
            const users = await User.find({ status: 'active' });
            for (const user of users) {
                // Reset monthly BV tracking
                user.thisMonthBV = 0;
                user.selfPurchase.thisMonthBV = 0;
                await user.save();

                // Check for rank upgrades and funds
                await mlmService.checkRankUpgrade(user._id);
                await bonusService.checkStockPointEligibility(user._id);
            }
            console.log(chalk.green('Monthly processing completed.'));
        } catch (error) {
            console.error(chalk.red('Monthly Processing Error:'), error);
        }
    });

    // 3. Daily Midnight Closings (for counters or daily caps)
    cron.schedule('0 0 * * *', async () => {
        console.log(chalk.dim('Resetting daily limits...'));
        await User.updateMany({}, {
            'fastTrack.dailyClosings': 0,
            'starMatchingBonus.dailyClosings': 0
        });
    });

    console.log(chalk.cyan('Cron jobs initialized successfully.'));
};
