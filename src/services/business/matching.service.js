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

        // 1. Qualification Check (1 Direct Left, 1 Direct Right) REQUIRED FOR ALL
        const user = await import('../../models/User.model.js').then(m => m.default.findById(userId));

        if (!user || user.leftDirectActive < 1 || user.rightDirectActive < 1) {
            console.log(`[Matching] User ${user.memberId} NOT QUALIFIED yet (Needs 1L + 1R Active Directs).`);
            return;
        }

        // 2. Time Check & Context Setup
        const now = new Date();
        const lastClosing = finance.fastTrack.lastClosingTime ? new Date(finance.fastTrack.lastClosingTime) : null;
        let isFlashOut = false;

        // Daily Limit Reset Logic
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

        // 4-Hour Gap Logic (Flash-Out vs Wait)
        if (lastClosing) {
            const diffMs = now - lastClosing;
            const fourHoursMs = 4 * 60 * 60 * 1000 - 60000; // 1 min buffer

            if (diffMs < fourHoursMs) {
                // "Flash Out" Condition: If match happens inside 4 hours, it counts but pays 0.
                isFlashOut = true;
                console.log(`[Matching] ${user.memberId} inside 4-hour window. Match will FLASH OUT (Pay 0).`);
            }
        }

        // 3. Calculate Available PV for Matching
        let leftAvailable = finance.fastTrack.pendingPairLeft + finance.fastTrack.carryForwardLeft;
        let rightAvailable = finance.fastTrack.pendingPairRight + finance.fastTrack.carryForwardRight;

        // Base Unit (Testing: 1 PV = 1 Unit)
        const UNIT_PV = 1;
        const PAYOUT_PER_MATCH = 500;

        if (leftAvailable <= 0 || rightAvailable <= 0) return;

        // 4. Checking Match History
        // Check if any previous payout exists (excluding flashouts? No, flashout counts as a match event usually)
        // User said: "1:2 or 2:1 must have to done otherwise 1:1 main paisa nhi milega"
        // If first match was Flash Out, does it count as "done"? 
        // Let's assume YES, because volume was consumed.
        const existingPayout = await Payout.findOne({
            userId: userId,
            payoutType: { $in: ['fast-track-bonus', 'fast-track-deduction', 'fast-track-flashout'] }
        });
        const isFirstMatch = !existingPayout;

        let matchAmount = 0;
        let matchedLeft = 0;
        let matchedRight = 0;
        let matchTriggered = false;

        if (isFirstMatch) {
            // first match Logic: 2:1 or 1:2
            if (leftAvailable >= 2 * UNIT_PV && rightAvailable >= 1 * UNIT_PV) {
                matchedLeft = 2 * UNIT_PV;
                matchedRight = 1 * UNIT_PV;
                matchAmount = PAYOUT_PER_MATCH;
                matchTriggered = true;
            } else if (leftAvailable >= 1 * UNIT_PV && rightAvailable >= 2 * UNIT_PV) {
                matchedLeft = 1 * UNIT_PV;
                matchedRight = 2 * UNIT_PV;
                matchAmount = PAYOUT_PER_MATCH;
                matchTriggered = true;
            }
        } else {
            // Subsequent Matches: 1:1
            if (leftAvailable >= UNIT_PV && rightAvailable >= UNIT_PV) {
                matchedLeft = UNIT_PV;
                matchedRight = UNIT_PV;
                matchAmount = PAYOUT_PER_MATCH;
                matchTriggered = true;
            }
        }

        if (!matchTriggered) return;

        // --- Apply Flash Out Logic ---
        if (isFlashOut) {
            matchAmount = 0; // Flash out
        }

        // Deductions & Payout (If not flushed)
        let adminCharge = 0;
        let tdsAmount = 0;
        let netAmount = 0;
        let isRankDeduction = false;
        let status = 'completed';
        let payoutType = 'fast-track-bonus';

        if (isFlashOut) {
            payoutType = 'fast-track-flashout';
            status = 'flushed';
        } else {
            // Normal Payout Logic
            const ADMIN_CHARGE_PERCENT = 0.05;
            const TDS_PERCENT = 0.02;

            adminCharge = matchAmount * ADMIN_CHARGE_PERCENT;
            tdsAmount = matchAmount * TDS_PERCENT;
            netAmount = matchAmount - adminCharge - tdsAmount;

            const previousPayoutsCount = await Payout.countDocuments({
                userId: userId,
                payoutType: { $in: ['fast-track-bonus', 'fast-track-deduction'] }
            });
            const closingCount = previousPayoutsCount + 1;
            const deductionPoints = [3, 6, 9, 12];

            if (deductionPoints.includes(closingCount)) {
                isRankDeduction = true;
                netAmount = 0;
                payoutType = 'fast-track-deduction';
                status = 'deducted';
                // Trigger Rank logic if needed
                if (closingCount === 12) {
                    await rankService.forceUpgrade(userId, 'Bronze');
                }
            }
        }

        // 6. Update State
        finance.fastTrack.lastClosingTime = now;
        finance.fastTrack.dailyClosings += 1;

        // Deduct Matched Points (Flush removes them too)
        finance.fastTrack.pendingPairLeft = 0; // Reset pending
        finance.fastTrack.pendingPairRight = 0;

        // Calculate Remainder for CF
        finance.fastTrack.carryForwardLeft = leftAvailable - matchedLeft;
        finance.fastTrack.carryForwardRight = rightAvailable - matchedRight;

        // Wallet Credit (Only if +ve and Completed)
        if (netAmount > 0 && status === 'completed') {
            finance.wallet.availableBalance += netAmount;
            finance.fastTrack.weeklyEarnings += netAmount;
            finance.wallet.totalEarnings += netAmount;
        }

        // Log Transaction
        await Payout.create({
            userId: userId,
            memberId: finance.memberId,
            payoutType,
            grossAmount: matchAmount,
            adminCharge,
            tdsDeducted: tdsAmount,
            netAmount,
            status,
            metadata: {
                isFlashOut: isFlashOut ? true : false,
                reason: isFlashOut ? '4-Hour Window Flush' : 'Matching Bonus'
            }
        });

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
