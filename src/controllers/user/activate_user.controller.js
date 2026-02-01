import User from '../../models/User.model.js';
import { mlmService } from '../../services/mlm.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

/**
 * Activate User and Propagate BV
 * POST /api/v1/user/activate
 */
export const activateUser = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    // Admin check or Payment Gateway Webhook logic would go here
    // For now, assuming authenticated admin/user action

    const targetId = userId || req.user._id;

    const user = await User.findById(targetId);
    if (!user) throw new ApiError(404, 'User not found');

    if (user.status === 'active') {
        throw new ApiError(400, 'User is already active');
    }

    // 1. Update Status
    user.status = 'active';
    user.activationDate = new Date();

    // 2. Assign Package BV (Flashout rule: start from 0 + package)
    const packageBV = 500; // Standard SSVPL Package
    const packagePV = 500; // Standard SSVPL PV (1:1 Ratio)

    user.personalBV = packageBV;
    user.totalBV = packageBV;
    user.thisMonthBV = packageBV;
    user.thisYearBV = packageBV;

    user.personalPV = packagePV;
    user.totalPV = packagePV;
    user.thisMonthPV = packagePV;
    user.thisYearPV = packagePV;

    await user.save();

    // 3. Propagate BV & PV Upstream
    await mlmService.propagateBVUpTree(
        user._id,
        user.position,
        packageBV,
        'activation',
        `ACT-${user.memberId}`,
        packagePV // New PV argument
    );

    // 4. Update Sponsor's Direct Active Count
    // We can re-run updateSponsorDirectCount logic
    await mlmService.updateSponsorDirectCount(user);

    // 5. Check if Sponsor gets any specific Sponsor Bonus? 
    // (Usually handled via BV Matching, but if there's direct referral bonus, add here)

    return res.status(200).json(
        new ApiResponse(200, {
            memberId: user.memberId,
            status: user.status,
            personalBV: user.personalBV
        }, 'User activated successfully. BV Propagated.')
    );
});
