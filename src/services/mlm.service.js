import User from '../models/User.model.js';
import Configs from '../config/config.js';
import chalk from 'chalk';

/**
 * Service to handle Genealogy Tree logic and Point Value (PV) propagation.
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
                return { parentId: current.memberId, position: 'right' };
            }

            // Move to left child and continue
            const nextNodeId = current.leftChild;
            current = await User.findById(nextNodeId);
            if (!current) break;
        }
        throw new Error('Could not find available position in the tree');
    },

    /**
     * Find available position in binary tree
     */
    findAvailablePosition: async (sponsorId, preferredPosition = null) => {
        const sponsor = await User.findOne({ memberId: sponsorId });

        if (!sponsor) {
            if (Configs.NODE_ENV === 'development') {
                console.log(chalk.bgRed('Sponsor not found!'));
            }
            throw new Error('Sponsor not found');
        }

        // Check if preferred position is available
        if (preferredPosition === 'left' && !sponsor.leftChild) {
            return { parentId: sponsor.memberId, position: 'left' };
        }

        if (preferredPosition === 'right' && !sponsor.rightChild) {
            return { parentId: sponsor.memberId, position: 'right' };
        }

        // If no preference or position taken, use spillover logic
        return await mlmService.findExtremeLeftPosition(sponsor);
    },

    /**
     * Update PV up the genealogy tree
     */
    updateUplinePV: async (parentMemberId, position, pv) => {
        let current = await User.findOne({ memberId: parentMemberId });

        while (current) {
            if (position === 'left') {
                current.leftLegPV += pv;
            } else {
                current.rightLegPV += pv;
            }

            current.totalPV = current.leftLegPV + current.rightLegPV + current.personalPV;
            await current.save();

            if (!current.parentId) break;

            const parent = await User.findOne({ memberId: current.parentId });
            if (!parent) break;
            position = current.position;
            current = parent;
        }
    }
};
