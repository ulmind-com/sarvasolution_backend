import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import UserFinance from '../../models/UserFinance.model.js';
import Payout from '../../models/Payout.model.js';

/**
 * Get personal repurchase status and eligibility for the current month
 */
export const getRepurchaseStatus = asyncHandler(async (req, res) => {
    const finance = await UserFinance.findOne({ user: req.user._id })
        .select('selfPurchase');

    if (!finance) throw new ApiError(404, 'Financial record not found');

    // Fetch recent history of repurchase bonuses earned (limited to 5 for status overview)
    const history = await Payout.find({
        userId: req.user._id,
        payoutType: 'repurchase-bonus'
    }).sort({ createdAt: -1 }).limit(5);

    return res.status(200).json(
        new ApiResponse(200, {
            currentStatus: finance.selfPurchase,
            recentHistory: history
        }, 'Repurchase status fetched successfully')
    );
});

/**
 * Get full paginated repurchase bonus history for user
 */
export const getRepurchaseHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const history = await Payout.find({
        userId: req.user._id,
        payoutType: 'repurchase-bonus'
    })
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit));

    const total = await Payout.countDocuments({
        userId: req.user._id,
        payoutType: 'repurchase-bonus'
    });

    return res.status(200).json(
        new ApiResponse(200, {
            history,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / limit)
            }
        }, 'Repurchase bonus history fetched')
    );
});
