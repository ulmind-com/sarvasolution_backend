import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import Payout from '../../models/Payout.model.js';
import moment from 'moment-timezone';
import { calculateBeginnerBonusData } from '../admin/beginnerBonus.controller.js';

/**
 * Get Live Status of Beginner Bonus for the logged-in user
 */
export const getBeginnerBonusStatus = asyncHandler(async (req, res) => {
    // Current month/year in IST
    const now = moment().tz("Asia/Kolkata");
    const month = now.month() + 1;
    const year = now.year();

    // Re-use calculation logic from admin (computes everything live)
    const { totalCompanyBV, poolAmount, totalUnits, pointValue, qualifiers } = await calculateBeginnerBonusData(month, year);

    // Find the current user in qualifiers
    const userId = req.user._id.toString();
    const userQualifier = qualifiers.find(q => q.userId.toString() === userId);

    const userStats = userQualifier ? userQualifier.stats : null;
    const userUnits = userQualifier ? userQualifier.units : 0;
    const estimatedPayout = userUnits * pointValue;

    return res.status(200).json(
        new ApiResponse(200, {
            summary: {
                totalCompanyBV,
                poolAmount,
                totalUnits,
                pointValue
            },
            userTracker: {
                stats: userStats, // { left: X, right: Y, personal: Z }
                units: userUnits,
                estimatedPayout: estimatedPayout,
                capped: userUnits === 10
            }
        }, 'Live tracking fetched successfully')
    );
});

/**
 * Get History of Beginner Bonus for the logged-in user
 */
export const getBeginnerBonusHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user._id;

    const payouts = await Payout.find({
        userId,
        payoutType: 'beginner-matching-bonus'
    })
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit));

    const total = await Payout.countDocuments({
        userId,
        payoutType: 'beginner-matching-bonus'
    });

    return res.status(200).json(
        new ApiResponse(200, {
            history: payouts,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / limit)
            }
        }, 'User beginner bonus history fetched successfully')
    );
});
