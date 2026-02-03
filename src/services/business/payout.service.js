import User from '../../models/User.model.js';
import Payout from '../../models/Payout.model.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Service to handle withdrawals and payout management.
 */
export const payoutService = {
    /**
     * Validate if a user can request a payout
     */
    validateWithdrawal: async (userId, amount) => {
        const user = await User.findById(userId);
        if (!user) throw new ApiError(404, 'User not found');

        if (amount < user.compliance.minimumWithdrawal) {
            throw new ApiError(400, `Minimum withdrawal amount is Rs.${user.compliance.minimumWithdrawal}`);
        }

        if (user.wallet.availableBalance < amount) {
            throw new ApiError(400, 'Insufficient balance in wallet');
        }

        return user;
    },

    /**
     * Request a withdrawal
     */
    requestWithdrawal: async (userId, requestedAmount) => {
        const user = await payoutService.validateWithdrawal(userId, requestedAmount);

        // Deductions
        const adminCharge = requestedAmount * (user.compliance.adminChargePercent / 100);
        const tdsAmount = requestedAmount * 0.02; // 2% TDS
        const netAmount = requestedAmount - adminCharge - tdsAmount;

        const payout = await Payout.create({
            userId,
            memberId: user.memberId,
            payoutType: 'direct-referral', // generic withdrawal type
            grossAmount: requestedAmount,
            adminCharge,
            tdsDeducted: tdsAmount,
            netAmount,
            status: 'pending',
            scheduledFor: payoutService.getNextPayoutDate()
        });

        // Deduct from available balance immediately to prevent double withdrawal
        user.wallet.availableBalance -= requestedAmount;
        user.wallet.pendingWithdrawal += netAmount;
        user.wallet.withdrawnAmount += requestedAmount;
        await user.save();

        return payout;
    },

    /**
     * Helper to get next Friday (SSVPL Payout day)
     */
    getNextPayoutDate: () => {
        const today = new Date();
        const nextFriday = new Date(today);
        nextFriday.setDate(today.getDate() + (5 + 7 - today.getDay()) % 7);
        nextFriday.setHours(11, 0, 0, 0);
        return nextFriday;
    }
};
