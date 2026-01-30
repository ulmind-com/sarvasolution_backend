import User from '../models/User.model.js';
import BVTransaction from '../models/BVTransaction.model.js';
import Payout from '../models/Payout.model.js';
import Configs from '../config/config.js';
import chalk from 'chalk';

/**
 * Service to handle Genealogy Tree logic and BV propagation.
 */
export const mlmService = {
    /**
     * Find extreme left available position (spillover)
     */
    findExtremeLeftPosition: async (parentUser) => {
        let current = parentUser;
        while (true) {
            if (!current.leftChild) {
                return { parentId: current.memberId, position: 'left' };
            }
            if (!current.rightChild) {
                // IMPORTANT: SSVPL Rule - If left is taken, spillover naturally fills right only if specifically balanced that way
                // But for "Extreme Left" logic, we just keep going Left.
                // However, "Extreme Left" usually means "Bottom-most Node on the Left Leg".
                // If a node has a Left Child, we go there.
                // If it ONLY has a Right Child (rare in strict binary fill), we might technically need to go there to continue left, 
                // but usually "Extreme Left" means following leftChild references.
            }

            // Traverse Left
            if (current.leftChild) {
                const nextNodeId = current.leftChild;
                current = await User.findById(nextNodeId);
                if (!current) break; // Should not happen if DB integrity holds
            } else {
                // If no left child, this IS the spot
                return { parentId: current.memberId, position: 'left' };
            }
        }
        throw new Error('Could not find available position in the tree');
    },

    /**
     * Find extreme right available position (spillover for right leg)
     */
    findExtremeRightPosition: async (parentUser) => {
        let current = parentUser;
        while (true) {
            if (!current.rightChild) {
                return { parentId: current.memberId, position: 'right' };
            }

            // Traverse Right
            const nextNodeId = current.rightChild;
            current = await User.findById(nextNodeId);
            if (!current) break;
        }
        throw new Error('Could not find available position in the tree');
    },

    /**
     * Find available position in binary tree
     * Supports Manual Placement Preference
     */
    findAvailablePosition: async (sponsorId, preferredPosition = null) => {
        const sponsor = await User.findOne({ memberId: sponsorId });
        if (!sponsor) throw new Error('Sponsor not found');

        // 1. Manual Left Preference
        if (preferredPosition === 'left') {
            if (!sponsor.leftChild) {
                return { parentId: sponsor.memberId, position: 'left' };
            } else {
                const leftChild = await User.findById(sponsor.leftChild);
                return await mlmService.findExtremeLeftPosition(leftChild);
            }
        }

        // 2. Manual Right Preference
        if (preferredPosition === 'right') {
            if (!sponsor.rightChild) {
                return { parentId: sponsor.memberId, position: 'right' };
            } else {
                const rightChild = await User.findById(sponsor.rightChild);
                return await mlmService.findExtremeRightPosition(rightChild);
            }
        }

        // 3. Auto-Balancing (Legacy/Extreme Left Spillover Default)
        return await mlmService.findExtremeLeftPosition(sponsor);
    },

    /**
     * Propagate BV up the entire upline chain
     */
    propagateBVUpTree: async (userId, position, bvAmount, transactionType = 'joining', referenceId = null) => {
        let current = await User.findById(userId);
        if (!current) return;

        // Start from parent
        let parentMemberId = current.parentId;
        let currentPosition = current.position;

        while (parentMemberId) {
            const parent = await User.findOne({ memberId: parentMemberId });
            if (!parent) break;

            if (currentPosition === 'left') {
                parent.leftLegBV += bvAmount;
            } else {
                parent.rightLegBV += bvAmount;
            }
            parent.totalBV += bvAmount;
            parent.thisMonthBV += bvAmount;
            parent.thisYearBV += bvAmount;

            await parent.save();

            // Record BV Transaction
            await BVTransaction.create({
                userId: parent._id,
                transactionType,
                bvAmount,
                legAffected: currentPosition,
                fromUserId: userId,
                referenceId
            });

            // Move up
            currentPosition = parent.position;
            parentMemberId = parent.parentId;
        }
    },

    /**
     * Calculate 2:1 or 1:2 Matching for First Payout
     * Returns true if first matching is achieved
     */
    checkFirstMatching: async (user) => {
        if (user.starMatching > 0) return true; // Already passed first matching

        const left = user.leftLegBV + user.carryForwardLeft;
        const right = user.rightLegBV + user.carryForwardRight;

        // 2:1 or 1:2 ratio (assuming 500 BV units for simple matching)
        if ((left >= 1000 && right >= 500) || (left >= 500 && right >= 1000)) {
            return true;
        }
        return false;
    },

    /**
     * Perform Daily/Weekly Binary Matching
     * Standard: 1:1 matching @ 10%
     */
    calculateBinaryMatching: async (userId) => {
        const user = await User.findById(userId);
        if (!user) return;

        // Rule 1: Must have 2 direct sponsors to unlock bonuses
        if (user.directSponsors.count < 2) {
            if (Configs.NODE_ENV === 'development') {
                console.log(chalk.yellow(`User ${user.memberId} not eligible for matching: Need 2 direct sponsors.`));
            }
            return;
        }

        const isFirst = await mlmService.checkFirstMatching(user);
        if (!isFirst) return; // Not eligible for matching yet

        // Matching logic
        let left = user.leftLegBV + user.carryForwardLeft;
        let right = user.rightLegBV + user.carryForwardRight;

        const matchingBV = Math.min(left, right);
        if (matchingBV <= 0) return;

        // Current Matching Index for Rank Deduction Rule
        const matchIndex = user.starMatching + 1;
        const isDeductionMatch = [3, 6, 9, 12].includes(matchIndex);

        // Matching Amount (10%)
        const grossAmount = matchingBV * 0.10;
        let adminCharge = grossAmount * (user.compliance.adminChargePercent / 100);
        let netAmount = grossAmount - adminCharge;

        if (isDeductionMatch) {
            // Rule 6: 3rd, 6th, 9th, 12th matching bonus auto-deduct for rank upgrade
            netAmount = 0; // Entire amount deducted
            // You might want to track these "invested" amounts elsewhere
        }

        // Payout Record
        await Payout.create({
            userId: user._id,
            memberId: user.memberId,
            payoutType: 'star-matching',
            grossAmount,
            adminCharge,
            netAmount,
            status: isDeductionMatch ? 'completed' : 'pending',
            metadata: {
                bvMatched: matchingBV,
                leftBV: left,
                rightBV: right,
                isRankDeduction: isDeductionMatch
            }
        });

        // Update User
        user.carryForwardLeft = left - matchingBV;
        user.carryForwardRight = right - matchingBV;
        user.leftLegBV = 0;
        user.rightLegBV = 0;
        user.starMatching += 1; // 1 Matching completed
        user.wallet.availableBalance += netAmount;
        user.wallet.totalEarnings += netAmount;

        await user.save();

        // Auto Rank Upgrade Check
        await mlmService.checkRankUpgrade(user._id);
    },

    /**
     * Auto Upgrade Rank based on Star Matching
     */
    checkRankUpgrade: async (userId) => {
        const user = await User.findById(userId);
        if (!user || !user.compliance.autoRankUpgrade) return;

        const ranks = [
            { name: 'Bronze', stars: 1, bonus: 500 },
            { name: 'Silver', stars: 5, bonus: 2500 },
            { name: 'Gold', stars: 30, bonus: 10000 },
            { name: 'Platinum', stars: 100, bonus: 25000 },
            { name: 'Diamond', stars: 300, bonus: 75000 },
            { name: 'Blue Diamond', stars: 750, bonus: 200000 },
            { name: 'Black Diamond', stars: 1500, bonus: 500000 },
            { name: 'Royal Diamond', stars: 3000, bonus: 1000000 },
            { name: 'Crown Diamond', stars: 7500, bonus: 2500000 },
            { name: 'Ambassador', stars: 15000, bonus: 5000000 },
            { name: 'Crown Ambassador', stars: 30000, bonus: 10000000 },
            { name: 'SSVPL Legend', stars: 75000, bonus: 25000000 }
        ];

        let newRank = user.currentRank;
        let rankBonus = 0;

        for (const r of ranks) {
            if (user.starMatching >= r.stars) {
                if (user.currentRank !== r.name && user.rankNumber > ranks.indexOf(r) + 1) {
                    newRank = r.name;
                    rankBonus = r.bonus;
                }
            }
        }

        if (newRank !== user.currentRank) {
            user.currentRank = newRank;
            user.rankNumber = ranks.findIndex(r => r.name === newRank) + 1;
            user.achievedDate = new Date();
            user.rankHistory.push({ rank: newRank });

            // Credit Rank Bonus
            if (rankBonus > 0) {
                await Payout.create({
                    userId: user._id,
                    memberId: user.memberId,
                    payoutType: 'direct-referral', // Or create a new type 'rank-bonus'
                    grossAmount: rankBonus,
                    adminCharge: rankBonus * 0.05,
                    netAmount: rankBonus * 0.95,
                    status: 'pending'
                });
                user.wallet.availableBalance += rankBonus * 0.95;
            }
            await user.save();
        }
    },

    /**
     * Fetch Genealogy Tree recursively
     * Limit depth to prevent performance issues
     */
    getGenealogyTree: async (userId, depth = 3) => {
        if (depth < 0) return null;

        const user = await User.findById(userId).select('fullName memberId currentRank position leftChild rightChild');
        if (!user) return null;

        const tree = {
            id: user._id,
            memberId: user.memberId,
            fullName: user.fullName,
            rank: user.currentRank,
            position: user.position,
            left: user.leftChild ? await mlmService.getGenealogyTree(user.leftChild, depth - 1) : null,
            right: user.rightChild ? await mlmService.getGenealogyTree(user.rightChild, depth - 1) : null
        };

        return tree;
    }
};
