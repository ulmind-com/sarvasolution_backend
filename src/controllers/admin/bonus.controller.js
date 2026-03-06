import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import RepurchaseBonusPool from '../../models/RepurchaseBonusPool.model.js';
import UserFinance from '../../models/UserFinance.model.js';
import { bonusService } from '../../services/business/bonus.service.js';

/**
 * Get all Repurchase Bonus Pool history (Paginated)
 */
export const getBonusPools = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const pools = await RepurchaseBonusPool.find()
        .sort({ year: -1, month: -1 })
        .skip(Number(skip))
        .limit(Number(limit));

    const total = await RepurchaseBonusPool.countDocuments();

    return res.status(200).json(
        new ApiResponse(200, {
            pools,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / limit)
            }
        }, 'Repurchase bonus pools fetched successfully')
    );
});

/**
 * Get Qualifiers for a specific pool
 */
export const getPoolQualifiers = asyncHandler(async (req, res) => {
    const { poolId } = req.params;

    const pool = await RepurchaseBonusPool.findById(poolId);
    if (!pool) throw new ApiError(404, 'Bonus pool record not found');

    // Finding qualifiers for THAT specific month is tricky because UserFinance status changes every month.
    // However, the Payouts record the history.
    // So we fetch payouts of type 'repurchase-bonus' created around the pool's processedAt date or month.

    const { Payout } = await import('../../models/Payout.model.js');

    // Using simple month/year check on Payouts if we added metadata or just by date range
    const startOfMonth = new Date(pool.year, pool.month - 1, 1);
    const endOfMonth = new Date(pool.year, pool.month, 0, 23, 59, 59);

    const payouts = await Payout.find({
        payoutType: 'repurchase-bonus',
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    }).populate('userId', 'fullName memberId phone active');

    return res.status(200).json(
        new ApiResponse(200, { pool, qualifiers: payouts }, 'Pool qualifiers fetched successfully')
    );
});

/**
 * Get currently qualifying users (Live tracking for 1-10 window)
 */
export const getLiveQualifiers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const query = {
        "selfPurchase.eligibleForRepurchaseBonus": true,
        "selfPurchase.repurchaseWindowBV": { $gte: 500 }
    };

    const qualifiers = await UserFinance.find(query)
        .populate('user', 'fullName memberId phone status')
        .skip(Number(skip))
        .limit(Number(limit));

    const total = await UserFinance.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(200, {
            qualifiers,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / limit)
            }
        }, 'Current window qualifiers fetched')
    );
});

/**
 * Get global history of all repurchase bonus payouts
 */
export const getAllRepurchaseHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, memberId } = req.query;
    const skip = (page - 1) * limit;

    const filter = { payoutType: 'repurchase-bonus' };

    if (memberId) {
        const { default: User } = await import('../../models/User.model.js');
        const user = await User.findOne({ memberId });
        if (user) filter.userId = user._id;
    }

    const { Payout } = await import('../../models/Payout.model.js');
    const history = await Payout.find(filter)
        .sort({ createdAt: -1 })
        .populate('userId', 'fullName memberId')
        .skip(Number(skip))
        .limit(Number(limit));

    const total = await Payout.countDocuments(filter);

    return res.status(200).json(
        new ApiResponse(200, {
            history,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / limit)
            }
        }, 'Global repurchase bonus history fetched')
    );
});

/**
 * Manually trigger bonus distribution (Admin override)
 */
export const triggerManualDistribution = asyncHandler(async (req, res) => {
    await bonusService.processMonthlyRepurchaseBonusPool();

    return res.status(200).json(
        new ApiResponse(200, {}, 'Manual bonus distribution triggered successfully')
    );
});
