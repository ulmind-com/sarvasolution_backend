import User from '../../models/User.model.js';
import BankAccount from '../../models/BankAccount.model.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

/**
 * Get current user profile
 */
export const getProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const user = await User.findById(userId).select('-password');
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    const bankAccount = await BankAccount.findOne({ userId });

    return res.status(200).json(
        new ApiResponse(200, { user, bankAccount }, 'Profile fetched successfully')
    );
});
