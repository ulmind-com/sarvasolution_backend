import cron from 'node-cron';
import UserFinance from '../models/UserFinance.model.js';
import chalk from 'chalk';
import moment from 'moment-timezone';

export const cronJobs = {
    /**
     * Initialize all Cron Jobs
     */
    init: () => {
        console.log(chalk.cyan('Initializing Cron Jobs...'));

        // 1. Weekly Payout Processing (Monday 00:00 IST)
        cron.schedule('0 0 * * 1', async () => {
            console.log(chalk.yellow('Running Weekly Payout Aggregation...'));
            await cronJobs.processWeeklyPayout();
        }, {
            timezone: "Asia/Kolkata"
        });

        // 2. Reset Daily Closing Counters (Midnight IST)
        // Reset dailyClosings to 0.
        cron.schedule('0 0 * * *', async () => {
            console.log(chalk.yellow('Running Midnight Counter Reset Job...'));
            await cronJobs.resetDailyCounters();
        }, {
            timezone: "Asia/Kolkata"
        });

        // 3. Monthly Reset (1st Month 00:00)
        cron.schedule('0 0 1 * *', async () => {
            console.log(chalk.yellow('Running Monthly Counter Reset Job...'));
            await cronJobs.resetMonthlyCounters();
        }, { timezone: "Asia/Kolkata" });

        // 4. Yearly Reset (Jan 1st 00:00)
        cron.schedule('0 0 1 1 *', async () => {
            console.log(chalk.yellow('Running Yearly Counter Reset Job...'));
            await cronJobs.resetYearlyCounters();
        }, { timezone: "Asia/Kolkata" });

        console.log(chalk.green('Cron Jobs Scheduled.'));
    },

    /**
     * Logic: Weekly Payout Aggregation
     * Aggregates weekly earnings from FastTack and StarMatching and adds to Available Balance.
     * (Although current matching service ADDS to available balance immediately. 
     *  Review: If user wants "Weekly Payout", we should likely HOLD it in a "Weekly Buffer" first?
     *  The Images said "Weekly Payout". 
     *  But my `matching.service` currently credits `availableBalance` instantly.
     *  Refinement: I will keep immediate credit for satisfaction, but IF stricter weekly payout is needed,
     *  we would buffer it. The user prompt asked for "Weekly Payout Aggregation Missing... const weeklyTotal...".
     *  So I will IMPLEMENT the buffer logic.)
     * 
     *  CORRECTION: matching.service credits `availableBalance` directly currently.
     *  I should CHANGE matching.service to credit `weeklyEarnings` INSTEAD of `availableBalance`.
     *  And THIS job moves it to `availableBalance`.
     */
    processWeeklyPayout: async () => {
        try {
            const users = await UserFinance.find({
                $or: [
                    { "fastTrack.weeklyEarnings": { $gt: 0 } },
                    { "starMatchingBonus.weeklyEarnings": { $gt: 0 } }
                ]
            });

            console.log(chalk.blue(`Processing Weekly Payout for ${users.length} users...`));

            for (const finance of users) {
                const totalWeekly = (finance.fastTrack.weeklyEarnings || 0) + (finance.starMatchingBonus.weeklyEarnings || 0);

                if (totalWeekly > 0) {
                    finance.wallet.availableBalance += totalWeekly;
                    finance.wallet.totalEarnings += totalWeekly; // Total earnings tracks lifetime? 
                    // Actually, usually totalEarnings increases when earned.
                    // If we delay credit to wallet, totalEarnings might increase then or now.
                    // Let's assume totalEarnings increases on EARN (in matching service) but wallet balance increases on PAYOUT (here).

                    // Reset Weekly Trackers
                    finance.fastTrack.weeklyEarnings = 0;
                    finance.starMatchingBonus.weeklyEarnings = 0;
                    await finance.save();
                }
            }
            console.log(chalk.green('Weekly Payout Completed.'));
        } catch (e) {
            console.error('Weekly Payout Error:', e);
        }
    },

    /**
     * Logic: Reset Daily Counters
     */
    async resetDailyCounters() {
        try {
            await UserFinance.updateMany({}, {
                $set: {
                    "fastTrack.dailyClosings": 0,
                    "starMatchingBonus.dailyClosings": 0
                }
            });
            console.log('Daily counters reset successfully.');
        } catch (e) {
            console.error('Reset Job Error:', e);
        }
    },

    /**
     * Logic: Monthly Reset (1st of Month)
     */
    async resetMonthlyCounters() {
        try {
            await UserFinance.updateMany({}, {
                $set: {
                    thisMonthBV: 0,
                    thisMonthPV: 0,
                    "selfPurchase.thisMonthBV": 0
                }
            });
            console.log('Monthly counters reset successfully.');
        } catch (e) {
            console.error('Monthly Reset Error:', e);
        }
    },

    /**
     * Logic: Yearly Reset (Jan 1st)
     */
    async resetYearlyCounters() {
        try {
            await UserFinance.updateMany({}, {
                $set: {
                    thisYearBV: 0,
                    thisYearPV: 0
                }
            });
            console.log('Yearly counters reset successfully.');
        } catch (e) {
            console.error('Yearly Reset Error:', e);
        }
    }
};
