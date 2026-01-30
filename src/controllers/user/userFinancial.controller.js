import User from '../../models/User.model.js';
import Payout from '../../models/Payout.model.js';
import BVTransaction from '../../models/BVTransaction.model.js';
import { payoutService } from '../../services/payout.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

/**
 * Get BV Summary for a user
 */
export const getBVSummary = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('leftLegBV rightLegBV carryForwardLeft carryForwardRight totalBV personalBV thisMonthBV');

    // Fetch recent transactions
    const transactions = await BVTransaction.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(10);

    return res.status(200).json(
        new ApiResponse(200, { summary: user, recentTransactions: transactions }, 'BV Summary fetched')
    );
});

/**
 * Get Funds Status
 */
export const getFundsStatus = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('bikeCarFund houseFund royaltyFund ssvplSuperBonus lsp msp');
    return res.status(200).json(
        new ApiResponse(200, user, 'Funds and Stock Point status fetched')
    );
});

/**
 * Request a payout / withdrawal
 */
export const requestPayout = asyncHandler(async (req, res) => {
    const { amount } = req.body;
    if (!amount) throw new ApiError(400, 'Withdrawal amount is required');

    const payout = await payoutService.requestWithdrawal(req.user._id, Number(amount));

    return res.status(201).json(
        new ApiResponse(201, payout, 'Payout request submitted successfully. Processing on Friday.')
    );
});

/**
 * Get Wallet and Earnings History
 */
export const getWalletInfo = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('wallet');
    const history = await Payout.find({ userId: req.user._id }).sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, { wallet: user.wallet, history }, 'Wallet info fetched')
    );
});

/**
 * Get Payout History (Dedicated Endpoint)
 */
export const getPayouts = asyncHandler(async (req, res) => {
    const payouts = await Payout.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(
        new ApiResponse(200, payouts, 'Payout history fetched')
    );
});

/**
 * Get Genealogy Tree
 */
export const getTree = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    let targetUser;

    if (memberId) {
        targetUser = await User.findOne({ memberId });
    } else {
        targetUser = await User.findById(req.user._id);
    }

    if (!targetUser) throw new ApiError(404, 'User not found');

    const tree = await mlmService.getGenealogyTree(targetUser._id, 3); // Default depth 3

    return res.status(200).json(
        new ApiResponse(200, tree, 'Genealogy tree fetched successfully')
    );
});
