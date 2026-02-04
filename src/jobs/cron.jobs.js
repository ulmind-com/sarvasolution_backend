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

        // 5. Automatic Payout Generation (Friday Night / Sat 00:00)
        // Runs every Saturday at 00:00 IST (Friday Night)
        cron.schedule('0 0 * * 6', async () => {
            console.log(chalk.magenta('Running Automatic Payout Generation...'));
            await cronJobs.processAutomaticPayouts();
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
    },

    /**
     * Logic: Automatic Payout Generation (Friday Night / Sat 00:00)
     * Iterates all users, checks balance > minWithdrawal, checks Compliance,
     * Creates Payout Request.
     */
    async processAutomaticPayouts() {
        console.log(chalk.blue('Processing Automatic Payout Requests...'));
        try {
            // Find users with balance > 0 (optimization)
            // Ideally should filter by minimum, but min varies by user compliance.
            // For now, get all with balance > 100 (safe lower bound)
            const finances = await UserFinance.find({
                "wallet.availableBalance": { $gt: 100 }
            }).populate('user'); // Need user for compliance checks

            let count = 0;
            for (const finance of finances) {
                if (!finance.user) continue;

                const user = finance.user;
                const balance = finance.wallet.availableBalance;
                const minWithdrawal = user.compliance?.minimumWithdrawal || 450; // Default 450

                // Check eligibility
                if (balance >= minWithdrawal) {
                    try {
                        // Reuse payoutService logic locally or call it? 
                        // Calling it is better but it does findById again inside.
                        // For bulk, let's reuse logic carefully.
                        // Actually, importing payoutService here caused circular dependency risk? 
                        // No, cron.jobs.js imports UserFinance. 
                        // Let's implement logic here to be safe and efficient.

                        const requestedAmount = balance; // Withdraw EVERYTHING available

                        // Deductions
                        const adminChargePercent = user.compliance?.adminChargePercent || 5;
                        const tdsPercent = user.compliance?.tdsPercent || 5; // Default ? 5% usually? previous code had 0.02 (2%). 
                        // Let's stick to user compliance or rigid logic.
                        // PayoutService used 0.02 hardcoded. I will stick to that to match existing logic.

                        const adminCharge = requestedAmount * (adminChargePercent / 100);
                        const tdsAmount = requestedAmount * 0.02; // 2% TDS
                        const netAmount = requestedAmount - adminCharge - tdsAmount;

                        const payout = await import('../models/Payout.model.js').then(m => m.default.create({
                            userId: user._id,
                            memberId: user.memberId,
                            payoutType: 'withdrawal',
                            grossAmount: requestedAmount,
                            adminCharge,
                            tdsDeducted: tdsAmount,
                            netAmount,
                            status: 'pending',
                            scheduledFor: new Date() // Scheduled NOW (or next batch)
                        }));

                        // Update Wallet
                        finance.wallet.availableBalance -= requestedAmount;
                        finance.wallet.pendingWithdrawal += netAmount;
                        finance.wallet.withdrawnAmount += requestedAmount; // Tracks gross withdrawn? Or should track net? Usually gross withdrawn from system.

                        await finance.save();
                        count++;
                        console.log(`Requested payout for ${user.memberId}: Rs.${requestedAmount}`);
                    } catch (err) {
                        console.error(`Failed payout for ${user.memberId}:`, err.message);
                    }
                }
            }
            console.log(chalk.green(`Automatic Payouts Generated: ${count} requests.`));

        } catch (e) {
            console.error('Automatic Payout Error:', e);
        }
    }
};
