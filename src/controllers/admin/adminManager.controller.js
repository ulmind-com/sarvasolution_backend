import User from '../../models/User.model.js';
import Payout from '../../models/Payout.model.js';
import BVTransaction from '../../models/BVTransaction.model.js';
import { mlmService } from '../../services/mlm.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Get Admin Dashboard Metrics
 */
export const getDashboardMetrics = asyncHandler(async (req, res) => {
    const totalMembers = await User.countDocuments({ role: 'user' });
    const activeMembers = await User.countDocuments({ status: 'active', role: 'user' });

    // Today's BV Volume
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayBV = await BVTransaction.aggregate([
        { $match: { createdAt: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: "$bvAmount" } } }
    ]);

    // Pending Payouts
    const pendingPayouts = await Payout.aggregate([
        { $match: { status: 'pending' } },
        { $group: { _id: null, totalAmount: { $sum: "$netAmount" }, count: { $sum: 1 } } }
    ]);

    // Rank stats
    const rankStats = await User.aggregate([
        { $group: { _id: "$currentRank", count: { $sum: 1 } } }
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            members: { total: totalMembers, active: activeMembers },
            volume: { todayBV: todayBV[0]?.total || 0 },
            finance: {
                pendingAmount: pendingPayouts[0]?.totalAmount || 0,
                pendingCount: pendingPayouts[0]?.count || 0
            },
            ranks: rankStats
        }, 'Dashboard metrics fetched')
    );
});

/**
 * Get All Payouts (Admin)
 */
export const getPayouts = asyncHandler(async (req, res) => {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const payouts = await Payout.find(filter).sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, payouts, 'Payouts fetched successfully')
    );
});

/**
 * Bulk Process Payouts (e.g., Friday Batch)
 */
export const bulkProcessPayouts = asyncHandler(async (req, res) => {
    const { payoutIds } = req.body;
    if (!payoutIds || !payoutIds.length) throw new ApiError(400, 'Payout IDs are required');

    const result = await Payout.updateMany(
        { _id: { $in: payoutIds }, status: 'pending' },
        { $set: { status: 'completed', processedAt: new Date() } }
    );

    return res.status(200).json(
        new ApiResponse(200, result, `${result.modifiedCount} payouts processed successfully`)
    );
});

/**
 * Manual BV Allocation (Admin Adjustment)
 */
export const addManualBV = asyncHandler(async (req, res) => {
    const { memberId, bvAmount, leg, description } = req.body;

    const user = await User.findOne({ memberId });
    if (!user) throw new ApiError(404, 'User not found');

    if (leg === 'left') user.leftLegBV += Number(bvAmount);
    else if (leg === 'right') user.rightLegBV += Number(bvAmount);
    else user.personalBV += Number(bvAmount);

    user.totalBV += Number(bvAmount);
    await user.save();

    // Record Transaction
    await BVTransaction.create({
        userId: user._id,
        transactionType: 'admin-adjustment',
        bvAmount: Number(bvAmount),
        legAffected: leg || 'none',
        description: description || 'Manual adjustment by Admin'
    });

    // Propagate if it's a leg BV
    if (leg === 'left' || leg === 'right') {
        await mlmService.propagateBVUpTree(user._id, leg, Number(bvAmount), 'admin-adjustment', 'ADMIN-ADJ');
    }

    return res.status(200).json(
        new ApiResponse(200, user, 'BV allocated successfully')
    );
});
