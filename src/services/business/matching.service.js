import UserFinance from '../../models/UserFinance.model.js';
import Payout from '../../models/Payout.model.js';
import Configs from '../../config/config.js';
import { rankService } from './rank.service.js';

export const matchingService = {

    /**
     * Process Fast Track Bonus (PV Based)
     * Triggered when new PV is added to a leg.
     */
    processFastTrackMatching: async (userId) => {
        const finance = await UserFinance.findOne({ user: userId });
        if (!finance) return;

        // 1. Qualification Check (1 Direct Left, 1 Direct Right)
        const user = await import('../../models/User.model.js').then(m => m.default.findById(userId));
        console.log(`[Matching] Checking User: ${user.memberId} | Active L/R: ${user.leftDirectActive}/${user.rightDirectActive}`);

        if (!user || user.leftDirectActive < 1 || user.rightDirectActive < 1) {
            console.log(`[Matching] User ${user.memberId} NOT QUALIFIED yet.`);
            return;
        }

        // 2. Check Daily Closing Limit & Time
        const now = new Date();
        const lastClosing = finance.fastTrack.lastClosingTime ? new Date(finance.fastTrack.lastClosingTime) : null;

        if (lastClosing) {
            const isSameDay = now.getDate() === lastClosing.getDate() &&
                now.getMonth() === lastClosing.getMonth() &&
                now.getFullYear() === lastClosing.getFullYear();

            if (!isSameDay) {
                finance.fastTrack.dailyClosings = 0;
                await finance.save();
            }
        }

        if (finance.fastTrack.dailyClosings >= 6) {
            console.log(`[Matching] Daily Limit Reached for ${user.memberId}`);
            return;
        }

        // 3. Check 4-Hour Gap (DISABLED FOR TESTING)
        /*
        if (lastClosing) {
            const diffMs = now - lastClosing;
            const fourHoursMs = 4 * 60 * 60 * 1000 - 60000; 
            if (diffMs < fourHoursMs) {
                console.log(`[Matching] 4-Hour Gap Rule. Skipping.`);
                return;
            }
        }
        */

        // 3. Calculate Available PV for Matching
        let leftAvailable = finance.fastTrack.pendingPairLeft + finance.fastTrack.carryForwardLeft;
        let rightAvailable = finance.fastTrack.pendingPairRight + finance.fastTrack.carryForwardRight;

        console.log(`[Matching] Available PV - Left: ${leftAvailable}, Right: ${rightAvailable}`);

        if (leftAvailable <= 0 || rightAvailable <= 0) return;

        // 4. Matching Logic (1:1 and 2:1/1:2)
        // Ratio: 500 PV match = 500 INR.

        // NEW: Check if any previous payout exists for Fast Track
        const existingPayout = await Payout.findOne({
            userId: userId,
            payoutType: { $in: ['fast-track-bonus', 'fast-track-deduction'] }
        });
        const isFirstMatch = !existingPayout;

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
                console.log(`[Matching] 1:1 Condition Failed (${leftAvailable}:${rightAvailable} < 500:500)`);
                return; // No 1:1 match
            }
        }

        console.log(`[Matching] MATCH FOUND! Amount: ${matchAmount}, Left: ${matchedLeft}, Right: ${matchedRight}`);

        // Deductions & Payout (5% Admin + 2% TDS)
        const ADMIN_CHARGE_PERCENT = 0.05;
        const TDS_PERCENT = 0.02;

        let adminCharge = matchAmount * ADMIN_CHARGE_PERCENT;
        let tdsAmount = matchAmount * TDS_PERCENT;
        let netAmount = matchAmount - adminCharge - tdsAmount;
        let isRankDeduction = false;

        // Rule: 3rd, 6th, 9th, 12th deduction
        // Rule: 3rd, 6th, 9th, 12th deduction
        // NEW: Check Payouts count for history instead of array
        const previousPayoutsCount = await Payout.countDocuments({
            userId: userId,
            payoutType: { $in: ['fast-track-bonus', 'fast-track-deduction'] }
        });
        const closingCount = previousPayoutsCount + 1;
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
        // finance.fastTrack.closingHistory.push({...}); // REMOVED for Scalability

        // Wallet Credit (To Weekly Earnings Buffer)
        if (netAmount > 0) {
            finance.wallet.availableBalance += netAmount; // Instant Credit
            finance.fastTrack.weeklyEarnings += netAmount; // Buffer/Stats
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

        // CHECK HISTORY for First Star Match Rule
        const existingStarPayout = await Payout.findOne({
            userId: userId,
            payoutType: 'star-matching-bonus'
        });
        const isFirstStarMatch = !existingStarPayout;

        if (isFirstStarMatch) {
            // First Match: 2:1 or 1:2 REQUIRED
            if (leftStars >= 2 && rightStars >= 1) {
                matchedLeft = 2; matchedRight = 1; matchFound = true;
            } else if (leftStars >= 1 && rightStars >= 2) {
                matchedLeft = 1; matchedRight = 2; matchFound = true;
            }
        } else {
            // Subsequent Matches: 1:1 Standard
            if (leftStars >= 1 && rightStars >= 1) {
                matchedLeft = 1; matchedRight = 1; matchFound = true;
            }
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

        finance.starMatchingBonus.carryForwardStarsLeft = leftStars - matchedLeft;
        finance.starMatchingBonus.carryForwardStarsRight = rightStars - matchedRight;

        // finance.starMatchingBonus.closingHistory.push({...}); // REMOVED for Scalability

        // Wallet Credit (Instant)
        finance.wallet.availableBalance += netAmount;
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
