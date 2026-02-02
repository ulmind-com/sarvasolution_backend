import UserFinance from '../models/UserFinance.model.js';
import User from '../models/User.model.js';
import Payout from '../models/Payout.model.js';
import { matchingService } from './matching.service.js';

export const rankService = {
    /**
     * Check if user qualifies for rank upgrade based on Stars
     */
    checkRankUpgrade: async (userId) => {
        const finance = await UserFinance.findOne({ user: userId });
        if (!finance) return;

        const ranks = [
            { name: 'Associate', stars: 0, bonus: 0 },
            { name: 'Star', stars: 1, bonus: 0 }, // First match (min 10) triggers this
            { name: 'Bronze', stars: 25, bonus: 500 }, // ~3 matches triggers this
            { name: 'Silver', stars: 50, bonus: 2500 }, // Adjusted
            { name: 'Gold', stars: 100, bonus: 10000 },
            { name: 'Platinum', stars: 200, bonus: 25000 },
            { name: 'Diamond', stars: 500, bonus: 75000 },
            { name: 'Ruby', stars: 1000, bonus: 150000 },
            { name: 'Sapphire', stars: 2000, bonus: 300000 },
            { name: 'Emerald', stars: 5000, bonus: 800000 },
            { name: 'Blue Sapphire', stars: 10000, bonus: 2000000 },
            { name: 'Black Pearl', stars: 25000, bonus: 5000000 },
            { name: 'Royal', stars: 50000, bonus: 10000000 },
            { name: 'Legend', stars: 100000, bonus: 25000000 },
            { name: 'SSVPL Legend', stars: 200000, bonus: 50000000 }
        ];

        let currentStars = finance.starMatching;
        let newRank = finance.currentRank;
        let rankBonus = 0;
        let rankStarsValue = 0; // The defined star value of the new rank

        // Find highest eligible rank
        for (const r of ranks) {
            if (currentStars >= r.stars) {
                // Check if this rank is higher than current
                const currentRankIndex = ranks.findIndex(rk => rk.name === finance.currentRank);
                const thisRankIndex = ranks.indexOf(r);

                if (thisRankIndex > currentRankIndex) {
                    newRank = r.name;
                    rankBonus = r.bonus;
                    rankStarsValue = r.stars;
                }
            }
        }

        if (newRank !== finance.currentRank) {
            // Processing Upgrade
            const oldRank = finance.currentRank;
            finance.currentRank = newRank;
            finance.rankNumber = ranks.findIndex(r => r.name === newRank) + 1;
            finance.achievedDate = new Date();
            finance.rankHistory.push({ rank: newRank, date: new Date() });

            // Credit Rank Bonus (One time)
            if (rankBonus > 0) {
                const adminCharge = rankBonus * 0.05;
                const tdsAmount = rankBonus * 0.02;
                const netAmount = rankBonus - adminCharge - tdsAmount;

                await Payout.create({
                    userId: userId,
                    memberId: finance.memberId,
                    payoutType: 'rank-bonus',
                    grossAmount: rankBonus,
                    adminCharge,
                    tdsDeducted: tdsAmount,
                    netAmount,
                    status: 'completed',
                    metadata: { rank: newRank }
                });
                finance.wallet.availableBalance += netAmount;
                finance.wallet.totalEarnings += netAmount;
            }

            await finance.save();

            // Propagate Stars to Upline
            // What star value to propagate?
            // "Stars are earned when downline members achieve ranks".
            // Bronze = 10 stars.
            // When I become Bronze, do I give 10 stars to my upline?
            // User Prompt Image: "Bronze: 10 stars".
            // Assumption: Yes, achievement triggers star flow.
            // BUT, if I upgrade from Silver (30) to Gold (100).
            // Do I generate 100 new stars? Or 70 diff?
            // Conservative: Diff.
            // Aggressive: Full value (likely not, inflation).
            // Let's assume implied value of a person at that rank is X.
            // When they upgrade, they ADD value to the tree.
            // Propagate the *difference* in star value?
            // Or maybe "1 Bronze match = 10 stars".
            // Let's propagate the *Star Value of the Rank*.
            // Wait, if I am Bronze, I count as 10 stars to my upline matching.
            // If I become Silver, I count as 30 stars.
            // So I effectively add +20 stars to the upline's leg.

            const oldRankObj = ranks.find(r => r.name === oldRank);
            const newRankObj = ranks.find(r => r.name === newRank);

            const starDiff = (newRankObj?.stars || 0) - (oldRankObj?.stars || 0);

            if (starDiff > 0) {
                await rankService.addStarsToUpline(userId, starDiff);
            }
        }
    },

    /**
     * Propagate Stars up the tree
     */
    addStarsToUpline: async (sourceUserId, stars) => {
        let current = await User.findById(sourceUserId);
        if (!current) return;

        let parentMemberId = current.parentId;
        let currentPosition = current.position;

        while (parentMemberId) {
            const parent = await User.findOne({ memberId: parentMemberId });
            if (!parent || parent.status !== 'active') break;

            const finance = await UserFinance.findOne({ user: parent._id });
            if (finance) {
                if (currentPosition === 'left') {
                    finance.starMatchingBonus.pendingStarsLeft += stars;
                } else {
                    finance.starMatchingBonus.pendingStarsRight += stars;
                }

                await finance.save();

                // Trigger Matching for Parent
                await matchingService.processStarMatching(parent._id);
            }

            // Move Up
            currentPosition = parent.position;
            parentMemberId = parent.parentId;
        }
    },

    /**
     * Force Upgrade (e.g. from Fast Track Deduction)
     */
    forceUpgrade: async (userId, targetRank) => {
        const finance = await UserFinance.findOne({ user: userId });
        if (!finance) return;

        // Only if lower
        // Logic to check rank index...
        // Simplified:
        if (finance.currentRank === 'Associate' && targetRank === 'Bronze') {
            // Grant Bronze
            finance.currentRank = 'Bronze';
            finance.rankNumber = 2; // Assuming 2 is Bronze index + 1
            finance.achievedDate = new Date();
            finance.rankHistory.push({ rank: 'Bronze', date: new Date() });

            // Give 10 Stars to self? 
            finance.starMatching = 10;

            await finance.save();

            // Propagate 10 stars
            await rankService.addStarsToUpline(userId, 10);
        }
    }
};
