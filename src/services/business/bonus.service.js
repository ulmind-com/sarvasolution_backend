import User from '../../models/User.model.js';
import Payout from '../../models/Payout.model.js';
import BVTransaction from '../../models/BVTransaction.model.js';
import UserFinance from '../../models/UserFinance.model.js';
import FranchiseSale from '../../models/FranchiseSale.model.js';
import RepurchaseBonusPool from '../../models/RepurchaseBonusPool.model.js';
import moment from 'moment-timezone';

/**
 * Service to handle Repurchase Bonuses and Stock Point incentives.
 */
export const bonusService = {
    /**
     * Calculate Self Repurchase Bonus (7% on own BV)
     * Rule: Must purchase by 10th of every month (handled in cron/controller)
     */
    calculateSelfRepurchaseBonus: async (userId, selfBV) => {
        const user = await User.findById(userId);
        if (!user) return;

        // Rule: Need 2 direct sponsors for most bonuses
        if (user.directSponsors.count < 2) return;
        const adminCharge = bonus * 0.05;   // 5% Admin
        const tdsDeducted = bonus * 0.02;   // 2% TDS
        const netAmount = bonus - adminCharge - tdsDeducted; // 93% net

        await Payout.create({
            userId,
            memberId: user.memberId,
            payoutType: 'repurchase-self',
            grossAmount: bonus,
            adminCharge,
            tdsDeducted,
            netAmount,
            status: 'pending'
        });

        user.selfPurchase.bonusEarned += bonus;
        user.wallet.availableBalance += netAmount;
        await user.save();
    },

    /**
     * Calculate Stock Point Bonuses
     * LSP: 10% on achieving 1 Lakh BV
     * MSP: 15% on achieving 5 Lakh BV
     */
    checkStockPointEligibility: async (userId) => {
        const user = await User.findById(userId);
        if (!user) return;

        // LSP Check
        if (!user.lsp.achieved && user.lsp.currentBV >= user.lsp.targetBV) {
            user.lsp.achieved = true;
            user.lsp.achievedDate = new Date();
            // Bonus logic could be a fixed amount or percentage of total volume
            // Assuming 10% of targetBV for now
            const bonus = user.lsp.targetBV * 0.10;
            await bonusService.createBonusPayout(user, 'lsp-bonus', bonus);
        }

        // MSP Check
        if (!user.msp.achieved && user.msp.currentBV >= user.msp.targetBV) {
            user.msp.achieved = true;
            user.msp.achievedDate = new Date();
            const bonus = user.msp.targetBV * 0.15;
            await bonusService.createBonusPayout(user, 'msp-bonus', bonus);
        }

        await user.save();
    },

    /**
     * Helper to create a payout for bonuses
     */
    createBonusPayout: async (user, type, amount) => {
        const adminCharge = amount * 0.05;   // 5% Admin
        const tdsDeducted = amount * 0.02;   // 2% TDS
        const netAmount = amount - adminCharge - tdsDeducted; // 93% net

        await Payout.create({
            userId: user._id,
            memberId: user.memberId,
            payoutType: type,
            grossAmount: amount,
            adminCharge,
            tdsDeducted,
            netAmount,
            status: 'pending'
        });

        user.wallet.availableBalance += netAmount;
        user.wallet.totalEarnings += amount; // totalEarnings tracks gross
    },

    /**
     * Phase 2: Monthly Repurchase Bonus Pool Distribution
     * Runs on the 1st of every month (via cron)
     * Calculates 7% of Total Company BV from prev month and distributes among qualifiers.
     */
    processMonthlyRepurchaseBonusPool: async () => {
        try {
            console.log('Starting Monthly Repurchase Bonus Pool Distribution...');

            const nowIST = moment().tz("Asia/Kolkata");
            const prevMonth = nowIST.clone().subtract(1, 'month');
            const month = prevMonth.month() + 1; // 1-12
            const year = prevMonth.year();

            // Check if already processed
            const existingPool = await RepurchaseBonusPool.findOne({ month, year });
            if (existingPool && existingPool.isProcessed) {
                console.log(`Bonus pool for ${month}/${year} already processed.`);
                return;
            }

            // 1. Calculate Total Company BV for the month
            const startOfMonth = prevMonth.clone().startOf('month').toDate();
            const endOfMonth = prevMonth.clone().endOf('month').toDate();

            const sales = await FranchiseSale.aggregate([
                {
                    $match: {
                        saleDate: { $gte: startOfMonth, $lte: endOfMonth },
                        paymentStatus: 'paid'
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalBV: { $sum: "$totalBV" }
                    }
                }
            ]);

            const totalCompanyBV = sales.length > 0 ? sales[0].totalBV : 0;
            const poolAmount = totalCompanyBV * 0.07;

            // 2. Find eligible users
            const qualifiers = await UserFinance.find({
                "selfPurchase.eligibleForRepurchaseBonus": true
            }).populate('user');

            const qualifierCount = qualifiers.length;

            if (qualifierCount === 0 || poolAmount === 0) {
                console.log('No qualifiers or zero pool amount for this month.');
                await RepurchaseBonusPool.create({
                    month, year, totalCompanyBV, poolAmount, qualifierCount: 0, bonusPerHead: 0,
                    isProcessed: true, processedAt: new Date()
                });
                return;
            }

            const bonusPerHead = poolAmount / qualifierCount;
            const adminChargePerHead = bonusPerHead * 0.05;   // 5% Admin
            const tdsPerHead = bonusPerHead * 0.02;           // 2% TDS
            const netBonusPerHead = bonusPerHead - adminChargePerHead - tdsPerHead; // 93% net

            console.log(`Distributing ₹${poolAmount.toFixed(2)} to ${qualifierCount} qualifiers. Bonus per head: ₹${bonusPerHead.toFixed(2)}`);

            // 3. Distribute to each qualifier
            for (const finance of qualifiers) {
                if (!finance.user) continue;

                // Create Payout
                await Payout.create({
                    userId: finance.user._id,
                    memberId: finance.user.memberId,
                    payoutType: 'repurchase-bonus',
                    grossAmount: bonusPerHead,
                    adminCharge: adminChargePerHead,
                    tdsDeducted: tdsPerHead,
                    netAmount: netBonusPerHead,
                    status: 'pending'
                });

                // Update Finance — credit 93% net to wallet
                finance.wallet.availableBalance += netBonusPerHead;
                finance.wallet.totalEarnings += bonusPerHead; // totalEarnings tracks gross
                finance.selfPurchase.bonusEarned += bonusPerHead;

                // We'll reset eligibility in the reset job, but we could do it here too if needed
                // finance.selfPurchase.eligibleForRepurchaseBonus = false; 
                // finance.selfPurchase.repurchaseWindowBV = 0;

                await finance.save();

                // Sync with User model
                await User.findByIdAndUpdate(finance.user._id, {
                    $inc: {
                        "wallet.availableBalance": netBonusPerHead,
                        "wallet.totalEarnings": bonusPerHead, // totalEarnings tracks gross
                        "selfPurchase.bonusEarned": bonusPerHead
                    }
                });
            }

            // 4. Record Pool Processing
            await RepurchaseBonusPool.create({
                month,
                year,
                totalCompanyBV,
                poolAmount,
                qualifierCount,
                bonusPerHead,
                isProcessed: true,
                processedAt: new Date()
            });

            console.log('Monthly Repurchase Bonus Pool Distribution Completed.');

        } catch (error) {
            console.error('Error in processMonthlyRepurchaseBonusPool:', error);
            throw error;
        }
    }
};
