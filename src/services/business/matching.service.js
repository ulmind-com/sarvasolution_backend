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

        // 2. Determine Current Time Slot (Fixed 4-Hour Windows)
        // Slots: 00-04, 04-08, 08-12, 12-16, 16-20, 20-00
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);

        const currentHour = now.getHours(); // 0-23
        const slotIndex = Math.floor(currentHour / 4); // 0 to 5

        const slotStartTime = new Date(startOfToday);
        slotStartTime.setHours(slotIndex * 4);

        const slotEndTime = new Date(startOfToday);
        slotEndTime.setHours((slotIndex + 1) * 4);

        // 3. Check for Existing Payout in THIS Slot
        // WE CHECK FOR *ANY* PAYOUT (Bonus, Deduction, OR Flashout) to determine if we act?
        // User said: "12 4 8 ... is time ke anr kaam hoga ... 1 ko chor ke baki sab flashout"
        // So: If 0 payouts in slot -> Valid Payout.
        // If >= 1 payout in slot -> Flash Out (still consumes points).

        const payoutsInSlot = await Payout.find({
            userId: userId,
            payoutType: { $in: ['fast-track-bonus', 'fast-track-deduction', 'fast-track-flashout'] },
            createdAt: { $gte: slotStartTime, $lt: slotEndTime }
        });

        // Loop through payouts to see if any was a "Real" payout vs Flashout.
        // Actually simplest rule: If ANY record exists in this slot, the NEW one is Flash Out.
        // Because even a Flashout consumes the slot? 
        // User: "ek din pe user 6 bar hi kar payega" (6 slots).
        // User: "agar e 4->8 ke bich 1:1 3-4 payment aya 1 ko chor ke baki sab flashout ho jayega"
        // So yes, >0 existing means current is FlashOut.

        let isFlashOut = payoutsInSlot.length > 0;
        if (isFlashOut) {
            console.log(`[Matching] Slot ${slotIndex} (${slotStartTime.getHours()}-${slotEndTime.getHours()}) already has ${payoutsInSlot.length} payouts. Triggering FLASHOUT.`);
        }

        // 4. Calculate Available PV
        let leftAvailable = finance.fastTrack.pendingPairLeft + finance.fastTrack.carryForwardLeft;
        let rightAvailable = finance.fastTrack.pendingPairRight + finance.fastTrack.carryForwardRight;

        // Base Unit (Testing: 1 PV = 1 Unit)
        const UNIT_PV = 1;
        const PAYOUT_PER_MATCH = 500;

        if (leftAvailable <= 0 || rightAvailable <= 0) return;

        // 5. Check Match History (First Match 2:1 Rule)
        // We count ALL history (including flashouts) for "Is First Match"?
        // User: "1:2 or 2:1 must have to done otherwise 1:1 main paisa nhi milega"
        // If first match attempt was Flushed, did they "do" it? Yes, volume consumed.
        const allHistoryCount = await Payout.countDocuments({
            userId: userId,
            payoutType: { $in: ['fast-track-bonus', 'fast-track-deduction', 'fast-track-flashout'] }
        });
        const isFirstMatch = allHistoryCount === 0;

        let matchAmount = 0;
        let matchedLeft = 0;
        let matchedRight = 0;
        let matchTriggered = false;

        if (isFirstMatch) {
            // First Match Logic: 2:1 or 1:2
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

        // 6. Deduction & Status Logic
        let adminCharge = 0;
        let tdsAmount = 0;
        let netAmount = 0; // Default 0
        let status = 'completed';
        let payoutType = 'fast-track-bonus';
        let closingCount = 0;

        if (isFlashOut) {
            payoutType = 'fast-track-flashout';
            status = 'flushed';
            matchAmount = 0; // Force 0
        } else {
            // Valid Payout Logic
            const ADMIN_CHARGE_PERCENT = 0.05;
            const TDS_PERCENT = 0.02;

            adminCharge = matchAmount * ADMIN_CHARGE_PERCENT;
            tdsAmount = matchAmount * TDS_PERCENT;
            netAmount = matchAmount - adminCharge - tdsAmount;

            // DEDUCTION LOGIC (3, 6, 9, 12)
            // Count ONLY valid payouts (bonus + deduction), EXCLUDING flashouts.
            const validPayoutsCount = await Payout.countDocuments({
                userId: userId,
                payoutType: { $in: ['fast-track-bonus', 'fast-track-deduction'] }
            });

            closingCount = validPayoutsCount + 1; // This is the Nth valid payout
            const deductionPoints = [3, 6, 9, 12];

            if (deductionPoints.includes(closingCount)) {
                netAmount = 0;
                payoutType = 'fast-track-deduction';
                status = 'deducted';
                // Trigger Rank logic (e.g. Bronze at 12th)
                if (closingCount === 12) {
                    await rankService.forceUpgrade(userId, 'Bronze');
                }
            }
        }

        // 7. Update State
        finance.fastTrack.lastClosingTime = now;

        // Only increment Daily Closings if it was a VALID payout (not flushed)
        if (status !== 'flushed') {
            finance.fastTrack.dailyClosings += 1;
        }

        // Reset Pending (consumed or moved to CF)
        finance.fastTrack.pendingPairLeft = 0;
        finance.fastTrack.pendingPairRight = 0;

        // Update CF with remaining
        finance.fastTrack.carryForwardLeft = leftAvailable - matchedLeft;
        finance.fastTrack.carryForwardRight = rightAvailable - matchedRight;

        // Wallet Credit (Only if +ve and Status Completed)
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
            grossAmount: (status === 'flushed') ? 0 : matchAmount, // 0 if flushed
            adminCharge: (status === 'flushed') ? 0 : adminCharge,
            tdsDeducted: (status === 'flushed') ? 0 : tdsAmount,
            netAmount,
            status,
            metadata: {
                isFlashOut: isFlashOut,
                reason: isFlashOut ? `Slot ${slotIndex} Limit Exceeded` : 'Matching Bonus',
                closingCount: (status !== 'flushed') ? closingCount : undefined
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
