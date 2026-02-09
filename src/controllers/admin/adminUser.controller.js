import User from '../../models/User.model.js';
import BankAccount from '../../models/BankAccount.model.js';
import { mailer } from '../../services/integration/mail.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

/**
 * Get all users with basic details
 */
export const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find({}).select('fullName memberId phone email role status rank joiningDate isFirstPurchaseDone');
    return res.status(200).json(
        new ApiResponse(200, users, 'Users fetched successfully')
    );
});

/**
 * Get specific user by memberId
 */
export const getUserByMemberId = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const user = await User.findOne({ memberId }).select('-password');

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    const bankAccount = await BankAccount.findOne({ userId: user._id });

    return res.status(200).json(
        new ApiResponse(200, { user, bankAccount }, 'User details fetched successfully')
    );
});

/**
 * Update any user details by Admin
 */
export const updateUserByAdmin = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const updates = req.body;

    // Sanitize inputs: Remove fields with value "string" (Swagger default) to prevent errors
    Object.keys(updates).forEach(key => {
        if (updates[key] === 'string' || updates[key] === '') {
            delete updates[key];
        }
    });

    const user = await User.findOne({ memberId });
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    // Uniqueness and limit checks
    if (updates.phone && updates.phone !== user.phone) {
        if (await User.findOne({ phone: updates.phone })) {
            throw new ApiError(400, 'Phone number already in use');
        }
    }

    // PAN Card Update DISABLED as per requirement.
    // Removed logic for PAN limit check.

    // Allowed fields for Admin Update - Admin can update EVERYTHING
    const allowedUpdates = [
        'fullName', 'email', 'phone', 'username',
        'role', 'status', 'address', 'kyc', 'profilePicture',
        'currentRank', 'joiningPackage',
        'panCardNumber', 'aadharCardNumber', 'bankDetails' // Added sensitive fields
    ];

    // Filter updates
    const safeUpdates = {};
    Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
            safeUpdates[key] = updates[key];
        }
    });

    // Map 'rank' input to 'currentRank' field
    if (updates.rank) {
        safeUpdates.currentRank = updates.rank;
    }

    // Track updates for notification
    const updatedFields = [];
    Object.keys(safeUpdates).forEach(key => {
        if (JSON.stringify(safeUpdates[key]) !== JSON.stringify(user[key])) {
            updatedFields.push(key.charAt(0).toUpperCase() + key.slice(1));
        }
    });

    Object.assign(user, safeUpdates);
    await user.save();

    if (updatedFields.length > 0) {
        mailer.sendUpdateNotification(user, updatedFields).catch(err => console.error('Admin update mail error:', err));
    }

    const updatedUser = await User.findOne({ memberId }).select('-password');
    return res.status(200).json(
        new ApiResponse(200, updatedUser, 'User updated successfully')
    );
});

/**
 * Verify or Reject user KYC
 */
export const verifyKYC = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
        throw new ApiError(400, 'Invalid status. Must be "verified" or "rejected".');
    }

    const user = await User.findOne({ memberId });
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    if (!user.kyc || user.kyc.status !== 'pending') {
        throw new ApiError(400, 'No pending KYC found for this user.');
    }

    user.kyc.status = status;
    user.kyc.verifiedAt = status === 'verified' ? new Date() : null;
    user.kyc.rejectionReason = status === 'rejected' ? rejectionReason : null;

    await user.save();

    // Send Status Update Email
    mailer.sendKYCStatusUpdate(user, status, rejectionReason).catch(err => console.error('KYC verify mail error:', err));

    return res.status(200).json(
        new ApiResponse(200, user.kyc, `KYC has been ${status} successfully.`)
    );
});
