import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import BeginnerBonusPool from '../../models/BeginnerBonusPool.model.js';
import UserFinance from '../../models/UserFinance.model.js';
import User from '../../models/User.model.js';
import FranchiseSale from '../../models/FranchiseSale.model.js';
import BVTransaction from '../../models/BVTransaction.model.js';
import Payout from '../../models/Payout.model.js';
import moment from 'moment-timezone';

/**
 * Common logic to calculate units
 * Uses UserFinance.thisMonthLeftLegBV / thisMonthRightLegBV / selfPurchase.thisMonthBV
 * These fields are maintained by mlmService.propagateBVUpTree and reset by cron monthly.
 * 
 * NOTE: For past months we fall back to BVTransaction aggregation since thisMonth fields
 * only reflect the CURRENT month.
 */
export const calculateBeginnerBonusData = async (targetMonth, targetYear) => {
    const now = moment().tz("Asia/Kolkata");
    const isCurrentMonth = (now.month() + 1 === targetMonth && now.year() === targetYear);

    const startOfMonth = moment.tz([targetYear, targetMonth - 1, 1], "Asia/Kolkata").startOf('month').toDate();
    const endOfMonth = moment.tz([targetYear, targetMonth - 1, 1], "Asia/Kolkata").endOf('month').toDate();

    // 1. Total Company BV from FranchiseSale
    const sales = await FranchiseSale.aggregate([
        {
            $match: {
                saleDate: { $gte: startOfMonth, $lte: endOfMonth },
                paymentStatus: 'paid'
            }
        },
        { $group: { _id: null, totalBV: { $sum: "$totalBV" } } }
    ]);
    const totalCompanyBV = sales.length > 0 ? sales[0].totalBV : 0;
    const poolAmount = totalCompanyBV * 0.18;

    // 2. Get active users
    // Note: Role filter removed — admin-role users are also MLM members and must be included
    const activeUsers = await User.find({ status: 'active' }).select('_id memberId fullName status role');
    const activeUserIds = activeUsers.map(u => u._id);

    let statsMap = new Map();

    if (isCurrentMonth) {
        // --- CURRENT MONTH: Use pre-maintained UserFinance fields (fast + accurate) ---
        const finances = await UserFinance.find({ user: { $in: activeUserIds } })
            .select('user thisMonthLeftLegBV thisMonthRightLegBV selfPurchase');

        for (const f of finances) {
            statsMap.set(f.user.toString(), {
                left: f.thisMonthLeftLegBV || 0,
                right: f.thisMonthRightLegBV || 0,
                personal: f.selfPurchase?.thisMonthBV || 0
            });
        }
    } else {
        // --- PAST MONTH: Fall back to BVTransaction aggregation ---
        // Here we aggregate LEFT/RIGHT per user from BVTransaction records,
        // but we must only count transactions where the userId is the DIRECT recipient,
        // meaning the record was written for THAT user's leg (not as an ancestor).
        // Since BVTransaction.userId = the ANCESTOR who accumulates, and
        // fromUserId = the actual purchaser, we group by userId+leg as normal.
        // This is correct because each user's left/right BVTransaction entries
        // represent what accumulated in their legs.
        const userStats = await BVTransaction.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth },
                    userId: { $in: activeUserIds },
                    legAffected: { $in: ['left', 'right'] }
                }
            },
            {
                $group: {
                    _id: { userId: "$userId", leg: "$legAffected" },
                    sum: { $sum: "$bvAmount" }
                }
            }
        ]);

        for (const stat of userStats) {
            const uid = stat._id.userId.toString();
            if (!statsMap.has(uid)) statsMap.set(uid, { left: 0, right: 0, personal: 0 });
            if (stat._id.leg === 'left') statsMap.get(uid).left += stat.sum;
            if (stat._id.leg === 'right') statsMap.get(uid).right += stat.sum;
        }

        // Get personal BV for past month from FranchiseSale (user own purchases)
        const personalSales = await FranchiseSale.aggregate([
            {
                $match: {
                    saleDate: { $gte: startOfMonth, $lte: endOfMonth },
                    paymentStatus: 'paid',
                    user: { $in: activeUserIds }
                }
            },
            { $group: { _id: "$user", totalBV: { $sum: "$totalBV" } } }
        ]);
        for (const ps of personalSales) {
            const uid = ps._id.toString();
            if (!statsMap.has(uid)) statsMap.set(uid, { left: 0, right: 0, personal: 0 });
            statsMap.get(uid).personal += ps.totalBV;
        }
    }

    // 3. Calculate units per qualifying user
    let qualifiers = [];
    let totalUnits = 0;

    for (const user of activeUsers) {
        const uid = user._id.toString();
        const stat = statsMap.get(uid) || { left: 0, right: 0, personal: 0 };

        let leftBV = stat.left;
        let rightBV = stat.right;
        const personalBV = stat.personal;

        // Personal BV added to the weaker leg
        if (leftBV <= rightBV) {
            leftBV += personalBV;
        } else {
            rightBV += personalBV;
        }

        const weakerLegBV = Math.min(leftBV, rightBV);
        let units = Math.floor(weakerLegBV / 1000);
        units = Math.min(units, 10); // Capped at 10 units

        if (units > 0) {
            qualifiers.push({
                userId: user._id,
                memberId: user.memberId,
                fullName: user.fullName,
                stats: stat,
                adjustedLeft: leftBV,
                adjustedRight: rightBV,
                units
            });
            totalUnits += units;
        }
    }

    const pointValue = totalUnits > 0 ? (poolAmount / totalUnits) : 0;

    return { totalCompanyBV, poolAmount, totalUnits, pointValue, qualifiers };
};

/**
 * Preview Beginner Matching Bonus Distribution
 */
export const getBeginnerBonusPreview = asyncHandler(async (req, res) => {
    let { month, year } = req.query;

    if (!month || !year) {
        // Default to previous month
        const prevMonth = moment().tz("Asia/Kolkata").subtract(1, 'month');
        month = prevMonth.month() + 1;
        year = prevMonth.year();
    } else {
        month = parseInt(month);
        year = parseInt(year);
    }

    // Check if already processed
    const existingPool = await BeginnerBonusPool.findOne({ month, year });

    const previewData = await calculateBeginnerBonusData(month, year);

    // If already processed, we should flag it so the UI can disable "Distribute"
    return res.status(200).json(
        new ApiResponse(200, {
            ...previewData,
            month,
            year,
            isProcessed: existingPool?.isProcessed || false,
            processedAt: existingPool?.processedAt
        }, 'Beginner bonus preview calculated successfully')
    );
});

/**
 * Distribute Beginner Matching Bonus
 */
export const distributeBeginnerBonus = asyncHandler(async (req, res) => {
    let { month, year } = req.body;

    if (!month || !year) {
        const prevMonth = moment().tz("Asia/Kolkata").subtract(1, 'month');
        month = prevMonth.month() + 1;
        year = prevMonth.year();
    } else {
        month = parseInt(month);
        year = parseInt(year);
    }

    const existingPool = await BeginnerBonusPool.findOne({ month, year });
    if (existingPool && existingPool.isProcessed) {
        throw new ApiError(400, `Beginner Matching Bonus for ${month}/${year} has already been distributed.`);
    }

    const { totalCompanyBV, poolAmount, totalUnits, pointValue, qualifiers } = await calculateBeginnerBonusData(month, year);

    if (qualifiers.length === 0 || poolAmount === 0 || pointValue === 0) {
        await BeginnerBonusPool.create({
            month, year, totalCompanyBV, poolAmount, totalUnits, pointValue, qualifierCount: 0,
            isProcessed: true, processedAt: new Date()
        });
        return res.status(200).json(new ApiResponse(200, {}, 'No qualifiers found for this month. Marked as processed.'));
    }

    // Distribute to qualifiers
    for (const q of qualifiers) {
        const grossAmount = q.units * pointValue;
        const adminCharge = grossAmount * 0.05;   // 5% Admin Charge
        const tdsDeducted = grossAmount * 0.02;   // 2% TDS
        const netAmount = grossAmount - adminCharge - tdsDeducted; // 93% net credited

        // Create Payout record
        await Payout.create({
            userId: q.userId,
            memberId: q.memberId,
            payoutType: 'beginner-matching-bonus',
            grossAmount,
            adminCharge,
            tdsDeducted,
            netAmount,
            status: 'pending',
            metadata: {
                unitsEarned: q.units,
                leftBV: q.stats.left,
                rightBV: q.stats.right
            }
        });

        // Credit net amount to wallet (Friday cron auto-creates withdrawal payout request)
        await UserFinance.findOneAndUpdate(
            { user: q.userId },
            {
                $inc: {
                    "wallet.availableBalance": netAmount,
                    "wallet.totalEarnings": grossAmount
                }
            }
        );

        // Sync with User model
        await User.findByIdAndUpdate(q.userId, {
            $inc: {
                "wallet.availableBalance": netAmount,
                "wallet.totalEarnings": grossAmount
            }
        });
    }

    // Save Pool History
    await BeginnerBonusPool.create({
        month,
        year,
        totalCompanyBV,
        poolAmount,
        totalUnits,
        pointValue,
        qualifierCount: qualifiers.length,
        isProcessed: true,
        processedAt: new Date()
    });

    return res.status(200).json(
        new ApiResponse(200, {
            distributedAmount: poolAmount,
            qualifierCount: qualifiers.length
        }, 'Beginner Matching Bonus distributed successfully')
    );
});

/**
 * Get History of Beginner Bonus Pools (Paginated)
 */
export const getBeginnerBonusHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const pools = await BeginnerBonusPool.find()
        .sort({ year: -1, month: -1 })
        .skip(Number(skip))
        .limit(Number(limit));

    const total = await BeginnerBonusPool.countDocuments();

    return res.status(200).json(
        new ApiResponse(200, {
            pools,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / limit)
            }
        }, 'Beginner bonus history fetched successfully')
    );
});

/**
 * Get all payouts for a specific Beginner Bonus pool month
 */
export const getBeginnerBonusQualifiers = asyncHandler(async (req, res) => {
    const { month, year, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    if (!month || !year) throw new ApiError(400, "Please provide month and year");

    const pool = await BeginnerBonusPool.findOne({ month: parseInt(month), year: parseInt(year) });
    if (!pool || !pool.isProcessed) {
        return res.status(200).json(
            new ApiResponse(200, { payouts: [], pagination: {} }, 'Pool not processed yet')
        );
    }

    // Payouts were created precisely at `pool.processedAt`. Allow a 5 min window for DB inserts.
    const processStart = new Date(pool.processedAt.getTime() - 5 * 60000);
    const processEnd = new Date(pool.processedAt.getTime() + 5 * 60000);

    const payouts = await Payout.find({
        payoutType: 'beginner-matching-bonus',
        createdAt: { $gte: processStart, $lte: processEnd }
    }).populate('userId', 'fullName memberId phone status')
        .skip(Number(skip))
        .limit(Number(limit));

    const total = await Payout.countDocuments({
        payoutType: 'beginner-matching-bonus',
        createdAt: { $gte: processStart, $lte: processEnd }
    });

    return res.status(200).json(
        new ApiResponse(200, {
            pool,
            payouts,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / limit)
            }
        }, 'Pool qualifiers fetched successfully')
    );
});
