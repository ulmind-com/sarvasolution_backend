
import UserFinance from '../../models/UserFinance.model.js';
import User from '../../models/User.model.js';
import { matchingService } from './matching.service.js';
import BVTransaction from '../../models/BVTransaction.model.js';
import Payout from '../../models/Payout.model.js';
import Configs from '../../config/config.js';
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
            if (!current) throw new Error('Invalid node iteration');

            if (!current.leftChild) {
                return { parentId: current.memberId, position: 'left' };
            }

            // Traverse Left (Linking uses ObjectId)
            const nextNodeId = current.leftChild;
            const nextNode = await User.findById(nextNodeId);

            if (!nextNode) {
                return { parentId: current.memberId, position: 'left' };
            }

            current = nextNode;
        }
        throw new Error('Could not find available position in the tree');
    },

    /**
     * Find extreme right available position (spillover for right leg)
     */
    findExtremeRightPosition: async (parentUser) => {
        let current = parentUser;
        while (true) {
            if (!current) throw new Error('Invalid node iteration');

            if (!current.rightChild) {
                return { parentId: current.memberId, position: 'right' };
            }

            // Traverse Right
            const nextNodeId = current.rightChild;
            const nextNode = await User.findById(nextNodeId);

            if (!nextNode) {
                return { parentId: current.memberId, position: 'right' };
            }

            current = nextNode;
        }
        throw new Error('Could not find available position in the tree');
    },

    /**
     * Find available position in binary tree
     */
    findAvailablePosition: async (sponsorId, preferredPosition = null) => {
        const sponsor = await User.findOne({ memberId: sponsorId });
        if (!sponsor) throw new Error('Sponsor not found');

        if (preferredPosition === 'left') {
            if (!sponsor.leftChild) {
                return { parentId: sponsor.memberId, position: 'left' };
            } else {
                const leftChild = await User.findById(sponsor.leftChild);
                if (!leftChild) return { parentId: sponsor.memberId, position: 'left' };
                return await mlmService.findExtremeLeftPosition(leftChild);
            }
        }

        if (preferredPosition === 'right') {
            if (!sponsor.rightChild) {
                return { parentId: sponsor.memberId, position: 'right' };
            } else {
                const rightChild = await User.findById(sponsor.rightChild);
                if (!rightChild) return { parentId: sponsor.memberId, position: 'right' };
                return await mlmService.findExtremeRightPosition(rightChild);
            }
        }

        return await mlmService.findExtremeLeftPosition(sponsor);
    },

    /**
     * Propagate BV & PV up the entire upline chain
     */
    propagateBVUpTree: async (userId, position, bvAmount, transactionType = 'joining', referenceId = null, pvAmount = 0) => {
        let current = await User.findById(userId);
        if (!current) return;

        // Start from parent
        let parentMemberId = current.parentId; // String MemberID
        let currentPosition = current.position;

        while (parentMemberId) {
            // Revert to findOne for String MemberID
            const parent = await User.findOne({ memberId: parentMemberId });
            if (!parent) break;

            if (parent.status === 'active') { // Only active accumulate
                // --- Update UserFinance ---
                let userFinance = await UserFinance.findOne({ user: parent._id });
                if (!userFinance) {
                    userFinance = new UserFinance({ user: parent._id, memberId: parent.memberId });
                }

                if (currentPosition === 'left') {
                    userFinance.leftLegBV += bvAmount;
                    userFinance.leftLegPV += pvAmount;
                    userFinance.fastTrack.pendingPairLeft += pvAmount;

                    // Sync User Model
                    parent.leftLegBV += bvAmount;
                    parent.leftLegPV += pvAmount;
                } else {
                    userFinance.rightLegBV += bvAmount;
                    userFinance.rightLegPV += pvAmount;
                    userFinance.fastTrack.pendingPairRight += pvAmount;

                    // Sync User Model
                    parent.rightLegBV += bvAmount;
                    parent.rightLegPV += pvAmount;
                }
                userFinance.totalBV += bvAmount;
                userFinance.totalPV += pvAmount;

                userFinance.thisMonthBV += bvAmount;
                userFinance.thisMonthPV += pvAmount;

                userFinance.thisYearBV += bvAmount;
                userFinance.thisYearPV += pvAmount;

                // Sync User Model Totals
                parent.totalBV += bvAmount;
                parent.totalPV += pvAmount;
                parent.thisMonthPV += pvAmount;
                parent.thisYearPV += pvAmount;
                parent.thisMonthBV += bvAmount;
                parent.thisYearBV += bvAmount;

                await userFinance.save();
                await parent.save();

                // Trigger Fast Track Bonus (PV Based)
                if (pvAmount > 0) {
                    await matchingService.processFastTrackMatching(parent._id);
                }

                await BVTransaction.create({
                    userId: parent._id,
                    transactionType,
                    bvAmount,
                    pvAmount,
                    legAffected: currentPosition,
                    fromUserId: userId,
                    referenceId
                });
            }

            // Move up
            currentPosition = parent.position;
            parentMemberId = parent.parentId;
        }
    },

    // ... (rest of service unchanged)
    checkFirstMatching: async (user) => {
        if (user.starMatching > 0) return true;

        const finance = await UserFinance.findOne({ user: user._id });
        if (!finance) return false;

        const left = finance.leftLegBV + finance.carryForwardLeft;
        const right = finance.rightLegBV + finance.carryForwardRight;

        if ((left >= 1000 && right >= 500) || (left >= 500 && right >= 1000)) {
            return true;
        }
        return false;
    },

    calculateBinaryMatching: async (userId) => { },

    checkRankUpgrade: async (userId) => {
        const user = await User.findById(userId);
        if (!user || user.status !== 'active') return;

        const userFinance = await UserFinance.findOne({ user: user._id });
        if (!userFinance) return;

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

        let newRank = userFinance.currentRank;
        let rankBonus = 0;

        for (const r of ranks) {
            if (userFinance.starMatching >= r.stars) {
                const currentIndex = ranks.findIndex(rk => rk.name === userFinance.currentRank);
                const candidateIndex = ranks.findIndex(rk => rk.name === r.name);

                // Treat 'Associate' as index -1
                const effectiveCurrentIndex = currentIndex === -1 ? -1 : currentIndex;

                if (candidateIndex > effectiveCurrentIndex) {
                    newRank = r.name;
                    rankBonus = r.bonus;
                }
            }
        }

        if (newRank !== userFinance.currentRank) {
            userFinance.currentRank = newRank;
            const idx = ranks.findIndex(r => r.name === newRank);
            userFinance.rankNumber = idx + 1;
            userFinance.achievedDate = new Date();
            userFinance.rankHistory.push({ rank: newRank });

            if (rankBonus > 0) {
                const adminCharge = rankBonus * 0.05;
                const netAmount = rankBonus * 0.95;

                await Payout.create({
                    userId: user._id,
                    memberId: user.memberId,
                    payoutType: 'rank-bonus', // Enum fixed
                    grossAmount: rankBonus,
                    adminCharge: adminCharge,
                    netAmount: netAmount,
                    status: 'pending'
                });
                userFinance.wallet.availableBalance += netAmount;
            }
            await userFinance.save();
        }
    },

    updateSponsorDirectCount: async (newUser) => {
        const sponsor = await User.findOne({ memberId: newUser.sponsorId });
        if (!sponsor) return;

        // Determine if new user is on sponsor's Left or Right leg
        // We need to trace down from sponsor to finding newUser? 
        // OR rely on `newUser.sponsorLeg` if we stored it?
        // In User model we added `sponsorLeg`. If available use it.
        // If not, we have to find out.
        // Fast way: check `sponsor.leftChild` or `sponsor.rightChild`?
        // No, direct can be deep down (spillover).

        // Efficient way: We just need to know if `newUser` is in `sponsor.leftChild` hierarchy or `rightChild`.
        // But `mlmService.findAvailablePosition` placed them.
        // If `newUser.position` relative to parent is known...
        // Wait, `sponsorLeg` was added to schema but might not be populated in old logic.
        // Let's rely on `newUser.sponsorLeg`. If not set, we might need traversal (expensive).
        // Let's assume we set it or will set it.

        let position = newUser.sponsorLeg;

        if (!position || position === 'none') {
            // Fallback: Check if newUser is descendant of left or right child of sponsor
            // This is heavy.
            // Better: update `register_user` to set `sponsorLeg`.
            // FOR NOW: We will fetch it if possible.
            // Actually, in `register_user`, we didn't set `sponsorLeg`. We should.
            // But let's assume we can fix it.

            // Alternative: traverse UP from newUser until we find Sponsor. 
            // The child of Sponsor we came from tells us the leg.
            let current = newUser;
            let parentId = newUser.parentId;
            while (parentId) {
                if (parentId === sponsor.memberId) {
                    // Found sponsor. `current` is the direct child of sponsor. (Or is it?)
                    // No, `current.parentId` is sponsor.
                    // So `current` is the child.
                    // Check `current.position` relative to sponsor.
                    // Sponsor's leftChild ID == current._id?
                    if (sponsor.leftChild && sponsor.leftChild.equals(current._id)) position = 'left';
                    else if (sponsor.rightChild && sponsor.rightChild.equals(current._id)) position = 'right';
                    break;
                }
                const parent = await User.findOne({ memberId: parentId });
                if (!parent) break;
                current = parent;
                parentId = parent.parentId;
            }
        }

        if (position === 'left') {
            if (newUser.status === 'active') sponsor.leftDirectActive += 1;
            else sponsor.leftDirectInactive += 1;
        } else if (position === 'right') {
            if (newUser.status === 'active') sponsor.rightDirectActive += 1;
            else sponsor.rightDirectInactive += 1;
        }

        await sponsor.save();
    },

    /**
     * Handle User Activation Event (Updates Sponsor Counts)
     */
    handleUserActivation: async (user) => {
        const sponsor = await User.findOne({ memberId: user.sponsorId });
        if (!sponsor) return;

        // Determine position (same logic as updateSponsorDirectCount or helper)
        let position = user.sponsorLeg;
        if (!position || position === 'none') {
            // Fallback traversal
            let current = user;
            let parentId = user.parentId;
            while (parentId) {
                if (parentId === sponsor.memberId) {
                    if (sponsor.leftChild && sponsor.leftChild.equals(current._id)) position = 'left';
                    else if (sponsor.rightChild && sponsor.rightChild.equals(current._id)) position = 'right';
                    break;
                }
                const parent = await User.findOne({ memberId: parentId });
                if (!parent) break;
                current = parent;
                parentId = parent.parentId;
            }
        }

        if (position === 'left') {
            sponsor.leftDirectInactive = Math.max(0, sponsor.leftDirectInactive - 1);
            sponsor.leftDirectActive += 1;
        } else if (position === 'right') {
            sponsor.rightDirectInactive = Math.max(0, sponsor.rightDirectInactive - 1);
            sponsor.rightDirectActive += 1;
        }

        await sponsor.save();
    },

    /**
     * Build Genealogy Tree with Complete Team Counts (Recursive)
     */
    getGenealogyTree: async (userId, depth = 3) => {
        const buildTreeNode = async (user, currentDepth) => {
            if (!user || currentDepth > depth) return null;

            // Get user finance for BV data
            const finance = await UserFinance.findOne({ user: user._id });

            // Recursive function to count all members in a subtree
            const countCompleteTeam = async (childId, status = null) => {
                if (!childId) return 0;

                const child = await User.findById(childId);
                if (!child) return 0;

                let count = 0;

                // Count this child if status matches (or count all if status is null)
                if (status === null || child.status === status) {
                    count = 1;
                }

                // Recursively count left and right subtrees
                if (child.leftChild) {
                    count += await countCompleteTeam(child.leftChild, status);
                }
                if (child.rightChild) {
                    count += await countCompleteTeam(child.rightChild, status);
                }

                return count;
            };

            // Recursive function to count total Star MEMBERS in a subtree
            const countTotalStars = async (childId) => {
                if (!childId) return 0;

                const child = await User.findById(childId);
                if (!child) return 0;

                const childFinance = await UserFinance.findOne({ user: child._id });
                // Count 1 if this user IS a Star, else 0
                let stars = (childFinance?.isStar) ? 1 : 0;

                // Recursively sum stars from left and right subtrees
                if (child.leftChild) {
                    stars += await countTotalStars(child.leftChild);
                }
                if (child.rightChild) {
                    stars += await countTotalStars(child.rightChild);
                }

                return stars;
            };

            // Count complete teams for left and right legs
            const leftCompleteActive = await countCompleteTeam(user.leftChild, 'active');
            const leftCompleteInactive = await countCompleteTeam(user.leftChild, 'inactive');
            const rightCompleteActive = await countCompleteTeam(user.rightChild, 'active');
            const rightCompleteInactive = await countCompleteTeam(user.rightChild, 'inactive');

            // Count total stars in left and right legs
            const leftLegStars = await countTotalStars(user.leftChild);
            const rightLegStars = await countTotalStars(user.rightChild);

            // Build node data
            const nodeData = {
                memberId: user.memberId,
                fullName: user.fullName,
                rank: user.currentRank,
                isStar: finance?.isStar || false, // Added isStar status
                position: user.position || 'root',
                profileImage: user.profilePicture?.url || null,
                sponsorId: user.sponsorId,
                joiningDate: user.createdAt,
                status: user.status,
                leftCompleteActive,
                leftCompleteInactive,
                rightCompleteActive,
                rightCompleteInactive,
                leftTeamCount: leftCompleteActive + leftCompleteInactive,
                rightTeamCount: rightCompleteActive + rightCompleteInactive,
                leftLegBV: finance?.leftLegBV || 0,
                rightLegBV: finance?.rightLegBV || 0,
                leftLegStars,
                rightLegStars
            };

            // Recursively build children if depth allows
            if (currentDepth < depth) {
                if (user.leftChild) {
                    const leftUser = await User.findById(user.leftChild);
                    nodeData.left = await buildTreeNode(leftUser, currentDepth + 1);
                } else {
                    nodeData.left = null;
                }

                if (user.rightChild) {
                    const rightUser = await User.findById(user.rightChild);
                    nodeData.right = await buildTreeNode(rightUser, currentDepth + 1);
                } else {
                    nodeData.right = null;
                }
            }

            return nodeData;
        };

        const rootUser = await User.findById(userId);
        if (!rootUser) return null;

        return await buildTreeNode(rootUser, 1);
    },

    /**
     * Get Complete Team for a Leg (Left/Right) with Pagination
     * Uses BFS to collect all descendant IDs, then fetches sorted/paginated data.
     */
    getCompleteLegTeam: async (userId, leg, page = 1, limit = 10) => {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        let startNodeId = null;
        if (leg === 'left') startNodeId = user.leftChild;
        else if (leg === 'right') startNodeId = user.rightChild;

        if (!startNodeId) {
            return {
                members: [],
                pagination: {
                    total: 0,
                    page,
                    limit,
                    pages: 0
                }
            };
        }

        // 1. Traverse and Collect ALL Member IDs in the Subtree (BFS)
        // Using iterative approach to prevent stack overflow
        const descendantIds = [];
        const queue = [startNodeId];

        while (queue.length > 0) {
            const currentId = queue.shift();
            descendantIds.push(currentId);

            const currentNode = await User.findById(currentId).select('leftChild rightChild');
            if (currentNode) {
                if (currentNode.leftChild) queue.push(currentNode.leftChild);
                if (currentNode.rightChild) queue.push(currentNode.rightChild);
            }
        }

        // 2. Fetch Details with Pagination
        const total = descendantIds.length;
        const skip = (page - 1) * limit;
        const totalPages = Math.ceil(total / limit);

        const members = await User.find({ _id: { $in: descendantIds } })
            .select('fullName memberId currentRank totalBV joiningDate status position sponsorId')
            .sort({ createdAt: -1 }) // Show newest first
            .skip(skip)
            .limit(limit);

        return {
            members,
            pagination: {
                total,
                page,
                limit,
                pages: totalPages
            }
        };
    },

    updateTeamCountsUpTree: async (userId) => { }
};
