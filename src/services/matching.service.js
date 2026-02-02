import UserFinance from '../models/UserFinance.model.js';
import Payout from '../models/Payout.model.js';
import Configs from '../config/config.js';
import { rankService } from './rank.service.js';

export const matchingService = {

    /**
     * Process Fast Track Bonus (PV Based)
     * Triggered when new PV is added to a leg.
     */
    processFastTrackMatching: async (userId) => {
        const finance = await UserFinance.findOne({ user: userId });
        if (!finance) return;

        // 1. Check Daily Closing Limit
        if (finance.fastTrack.dailyClosings >= 6) {
            console.log(`Daily Limit Reached for ${finance.memberId}`);
            return; // Strict Cap: Volume stays in pending/carryForward for next day
        }

        // 2. Check 4-Hour Gap
        const now = new Date();
        if (finance.fastTrack.lastClosingTime) {
            const diffMs = now - new Date(finance.fastTrack.lastClosingTime);
            const fourHoursMs = 4 * 60 * 60 * 1000;
            if (diffMs < fourHoursMs) {
                return; // Gap not met
            }
        }

        // 3. Calculate Available PV for Matching
        // Pending Pair = New incoming PV buffer. 
        // Carry Forward = Unmatched from previous cycles.
        let leftAvailable = finance.fastTrack.pendingPairLeft + finance.fastTrack.carryForwardLeft;
        let rightAvailable = finance.fastTrack.pendingPairRight + finance.fastTrack.carryForwardRight;

        if (leftAvailable <= 0 || rightAvailable <= 0) return;

        // 4. Matching Logic (1:1 and 2:1/1:2)
        // Ratio: 500 PV match = 500 INR.

        const isFirstMatch = finance.fastTrack.closingHistory.length === 0;
        let matchAmount = 0;
        let matchedLeft = 0;
        let matchedRight = 0;

        // Base Unit
        const UNIT_PV = 500;
        const PAYOUT_PER_MATCH = 500;

        if (isFirstMatch) {
            // Check 2:1 or 1:2
            // 2:1 -> 1000 Left, 500 Right
            // 1:2 -> 500 Left, 1000 Right
            if (leftAvailable >= 2 * UNIT_PV && rightAvailable >= 1 * UNIT_PV) {
                matchedLeft = 2 * UNIT_PV;
                matchedRight = 1 * UNIT_PV;
                matchAmount = PAYOUT_PER_MATCH;
            } else if (leftAvailable >= 1 * UNIT_PV && rightAvailable >= 2 * UNIT_PV) {
                matchedLeft = 1 * UNIT_PV;
                matchedRight = 2 * UNIT_PV;
                matchAmount = PAYOUT_PER_MATCH;
            } else {
                return; // First condition unmet
            }
        } else {
            // Standard 1:1 Matching
            if (leftAvailable >= UNIT_PV && rightAvailable >= UNIT_PV) {
                matchedLeft = UNIT_PV;
                matchedRight = UNIT_PV;
                matchAmount = PAYOUT_PER_MATCH;
            } else {
                return; // No 1:1 match
            }
        }

        // Deductions & Payout (5% Admin + 2% TDS)
        const ADMIN_CHARGE_PERCENT = 0.05;
        const TDS_PERCENT = 0.02;

        let adminCharge = matchAmount * ADMIN_CHARGE_PERCENT;
        let tdsAmount = matchAmount * TDS_PERCENT;
        let netAmount = matchAmount - adminCharge - tdsAmount;
        let isRankDeduction = false;

        // Rule: 3rd, 6th, 9th, 12th deduction
        const closingCount = finance.fastTrack.closingHistory.length + 1;
        const deductionPoints = [3, 6, 9, 12];

        if (deductionPoints.includes(closingCount)) {
            isRankDeduction = true;
            // Full deduction for rank upgrade
            netAmount = 0;
        }

        // 6. Update State
        // Reduce from Pending first, then Carry Forward

        // Update DB
        finance.fastTrack.lastClosingTime = now;
        finance.fastTrack.dailyClosings += 1;

        // Reset Pending (consumed or moved to CF)
        finance.fastTrack.pendingPairLeft = 0;
        finance.fastTrack.pendingPairRight = 0;

        // Update CF with remaining
        finance.fastTrack.carryForwardLeft = leftAvailable - matchedLeft;
        finance.fastTrack.carryForwardRight = rightAvailable - matchedRight;

        // History
        finance.fastTrack.closingHistory.push({
            timestamp: now,
            leftPV: matchedLeft,
            rightPV: matchedRight,
            amount: matchAmount,
            deductedForRank: isRankDeduction
        });

        // Wallet Credit (To Weekly Earnings Buffer)
        if (netAmount > 0) {
            // finance.wallet.availableBalance += netAmount; // MOVED TO WEEKLY CRON
            finance.fastTrack.weeklyEarnings += netAmount; // Buffer
            finance.wallet.totalEarnings += netAmount; // Lifetime Stats increase immediately

            await Payout.create({
                userId: userId,
                memberId: finance.memberId,
                payoutType: 'fast-track-bonus',
                grossAmount: matchAmount,
                adminCharge,
                tdsDeducted: tdsAmount,
                netAmount,
                status: 'completed',
                metadata: {
                    closingCount
                }
            });
        } else if (isRankDeduction) {
            // Record the deduction
            await Payout.create({
                userId: userId,
                memberId: finance.memberId,
                payoutType: 'fast-track-deduction',
                grossAmount: matchAmount,
                adminCharge: 0,
                netAmount: 0,
                status: 'deducted',
                metadata: {
                    closingCount,
                    reason: 'Rank Upgrade Contribution'
                }
            });

            // If 12th match (4th deduction), trigger Bronze Upgrade?
            if (closingCount === 12) {
                await rankService.forceUpgrade(userId, 'Bronze');
            }
        }

        await finance.save();
    },

    /**
     * Process Star Matching Bonus
     * Triggered when Downline Rank Upgrades occur.
     */
    processStarMatching: async (userId) => {
        const finance = await UserFinance.findOne({ user: userId });
        if (!finance) return;

        // 1. Check Daily Limit (Max 6)
        if (finance.starMatchingBonus.dailyClosings >= 6) return;

        // 2. Check 4-Hour Gap
        const now = new Date();
        if (finance.starMatchingBonus.lastClosingTime) {
            const diffMs = now - new Date(finance.starMatchingBonus.lastClosingTime);
            if (diffMs < 4 * 60 * 60 * 1000) return;
        }

        // 3. Available Stars
        let leftStars = finance.starMatchingBonus.pendingStarsLeft + finance.starMatchingBonus.carryForwardStarsLeft;
        let rightStars = finance.starMatchingBonus.pendingStarsRight + finance.starMatchingBonus.carryForwardStarsRight;

        // 4. Matching Logic
        let matchedLeft = 0;
        let matchedRight = 0;
        let matchFound = false;

        if (leftStars >= 20 && rightStars >= 10) {
            matchedLeft = 20; matchedRight = 10; matchFound = true;
        } else if (leftStars >= 10 && rightStars >= 20) {
            matchedLeft = 10; matchedRight = 20; matchFound = true;
        } else if (leftStars >= 10 && rightStars >= 10) {
            matchedLeft = 10; matchedRight = 10; matchFound = true;
        }

        if (!matchFound) return;

        // 5. Payout
        const PAYOUT = 1500;
        const ADMIN_CHARGE_PERCENT = 0.05;
        const TDS_PERCENT = 0.02;

        let adminCharge = PAYOUT * ADMIN_CHARGE_PERCENT;
        let tdsAmount = PAYOUT * TDS_PERCENT;
        let netAmount = PAYOUT - adminCharge - tdsAmount;

        // 6. Update
        finance.starMatchingBonus.lastClosingTime = now;
        finance.starMatchingBonus.dailyClosings += 1;

        finance.starMatchingBonus.pendingStarsLeft = 0;
        finance.starMatchingBonus.pendingStarsRight = 0;

        finance.starMatchingBonus.carryForwardStarsLeft = leftStars - matchedLeft;
        finance.starMatchingBonus.carryForwardStarsRight = rightStars - matchedRight;

        finance.starMatchingBonus.closingHistory.push({
            timestamp: now,
            leftStars: matchedLeft,
            rightStars: matchedRight,
            amount: PAYOUT
        });

        // Wallet Credit (To Weekly Earnings Buffer)
        // finance.wallet.availableBalance += netAmount; // MOVED TO WEEKLY CRON
        finance.starMatchingBonus.weeklyEarnings += netAmount;
        finance.wallet.totalEarnings += netAmount;

        await Payout.create({
            userId: userId,
            memberId: finance.memberId,
            payoutType: 'star-matching-bonus',
            grossAmount: PAYOUT,
            adminCharge,
            tdsDeducted: tdsAmount,
            netAmount,
            status: 'completed'
        });

        await finance.save();

        // 7. Auto Rank Upgrade? 
        // Add min stars matched
        finance.starMatching += Math.min(matchedLeft, matchedRight);
        await finance.save();

        // Trigger Rank Upgrade Check
        await rankService.checkRankUpgrade(userId);
    }
};
