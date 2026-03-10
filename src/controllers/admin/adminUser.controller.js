import User from '../../models/User.model.js';
import BankAccount from '../../models/BankAccount.model.js';
import { mailer } from '../../services/integration/mail.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

import UserFinance from '../../models/UserFinance.model.js';

/**
 * Get all users with basic details
 */
export const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find({}).select('fullName memberId phone email role status createdAt createdAt_IST isFirstPurchaseDone').lean();

    // Fetch first purchase date for activationDate mapping
    const { default: FranchiseSale } = await import('../../models/FranchiseSale.model.js');
    const userIds = users.filter(u => u.isFirstPurchaseDone || u.status === 'active').map(u => u._id);

    const firstSales = await FranchiseSale.aggregate([
        { $match: { user: { $in: userIds } } },
        { $sort: { saleDate: 1 } },
        { $group: { _id: "$user", firstPurchaseDate: { $first: "$saleDate" } } }
    ]);

    const activationMap = {};
    firstSales.forEach(sale => {
        activationMap[sale._id.toString()] = sale.firstPurchaseDate;
    });

    // Fetch UserFinance to get the CORRECT currentRank
    const { default: UserFinance } = await import('../../models/UserFinance.model.js');
    const finances = await UserFinance.find({ user: { $in: users.map(u => u._id) } }).select('user currentRank').lean();

    const rankMap = {};
    finances.forEach(f => {
        rankMap[f.user.toString()] = f.currentRank;
    });

    const enrichedUsers = users.map(u => ({
        ...u,
        rank: rankMap[u._id.toString()] || 'Associate',
        joiningDate: u.createdAt_IST || u.createdAt,
        activationDate: activationMap[u._id.toString()] || null
    }));

    return res.status(200).json(
        new ApiResponse(200, enrichedUsers, 'Users fetched successfully')
    );
});

/**
 * Get all users' wallet balances (Merged)
 */
export const getAllUserWallets = asyncHandler(async (req, res) => {
    const users = await User.find({}).select('fullName memberId phone email status rank joiningDate').lean();
    const userIds = users.map(u => u._id);
    const finances = await UserFinance.find({ user: { $in: userIds } }).select('user wallet').lean();

    const financeMap = {};
    finances.forEach(f => {
        financeMap[f.user.toString()] = f.wallet;
    });

    const mergedUsers = users.map(user => ({
        ...user,
        wallet: financeMap[user._id.toString()] || { availableBalance: 0, totalEarnings: 0, withdrawnAmount: 0, pendingWithdrawal: 0 }
    }));

    return res.status(200).json(
        new ApiResponse(200, mergedUsers, 'User wallets fetched successfully')
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
    const userFinance = await UserFinance.findOne({ user: user._id }).select('wallet');

    const userData = user.toObject();
    if (userFinance && userFinance.wallet) {
        userData.wallet = userFinance.wallet;
    }

    return res.status(200).json(
        new ApiResponse(200, { user: userData, bankAccount }, 'User details fetched successfully')
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
        'panCardNumber', 'bankDetails' // bankDetails updates BankAccount collection
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

    // Special handling for nested objects (KYC, address, bankDetails)
    // These need to be merged, not replaced entirely
    if (safeUpdates.kyc) {
        user.kyc = { ...user.kyc.toObject(), ...safeUpdates.kyc };
        delete safeUpdates.kyc; // Remove from safeUpdates to avoid Object.assign overwrite
    }

    if (safeUpdates.address) {
        user.address = { ...user.address, ...safeUpdates.address };
        delete safeUpdates.address;
    }

    if (safeUpdates.bankDetails) {
        user.bankDetails = { ...user.bankDetails, ...safeUpdates.bankDetails };
        delete safeUpdates.bankDetails;
    }

    // Track updates for notification
    const updatedFields = [];
    Object.keys(safeUpdates).forEach(key => {
        if (JSON.stringify(safeUpdates[key]) !== JSON.stringify(user[key])) {
            updatedFields.push(key.charAt(0).toUpperCase() + key.slice(1));
        }
    });

    // Track nested object updates
    if (updates.kyc) updatedFields.push('KYC');
    if (updates.address) updatedFields.push('Address');
    if (updates.bankDetails) updatedFields.push('Bank Details');


    Object.assign(user, safeUpdates);
    await user.save();

    // Handle Bank Account Updates (separate collection)
    if (updates.bankDetails) {
        let bankAccount = await BankAccount.findOne({ userId: user._id });

        if (bankAccount) {
            // Update existing bank account
            Object.assign(bankAccount, updates.bankDetails);
            await bankAccount.save();
            console.log(`Updated bank account for ${user.memberId}`);
        } else {
            // Create new bank account if doesn't exist
            bankAccount = new BankAccount({
                userId: user._id,
                ...updates.bankDetails
            });
            await bankAccount.save();
            console.log(`Created bank account for ${user.memberId}`);
        }
    }

    if (updatedFields.length > 0) {
        mailer.sendUpdateNotification(user, updatedFields).catch(err => console.error('Admin update mail error:', err));
    }

    const updatedUser = await User.findOne({ memberId }).select('-password');
    const bankAccount = await BankAccount.findOne({ userId: user._id });

    return res.status(200).json(
        new ApiResponse(200, {
            user: updatedUser,
            bankAccount: bankAccount || null
        }, 'User updated successfully')
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
/**
 * Force Change User Password (Admin)
 */
export const changeUserPassword = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        throw new ApiError(400, 'Password must be at least 6 characters');
    }

    const user = await User.findOne({ memberId });
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    user.password = newPassword; // Will be hashed by pre-save hook
    await user.save();

    return res.status(200).json(
        new ApiResponse(200, {}, `Password changed successfully for ${user.fullName}`)
    );
});
/**
 * Get all users with full KYC and Bank details for verification (Admin only)
 */
export const getUsersKYCDetails = asyncHandler(async (req, res) => {
    const { status } = req.query;

    const pipeline = [];

    // Filter by KYC status if provided
    if (status && ['none', 'pending', 'verified', 'rejected'].includes(status)) {
        pipeline.push({
            $match: { 'kyc.status': status }
        });
    }

    // Lookup BankAccount details
    pipeline.push({
        $lookup: {
            from: 'bankaccounts', // collection name in MongoDB
            localField: '_id',
            foreignField: 'userId',
            as: 'bankAccount'
        }
    });

    // Unwind bankAccount (since it's a 1-to-1 relationship, but lookup returns array)
    pipeline.push({
        $unwind: {
            path: '$bankAccount',
            preserveNullAndEmptyArrays: true
        }
    });

    // Project only necessary fields
    pipeline.push({
        $project: {
            fullName: 1,
            memberId: 1,
            phone: 1,
            email: 1,
            panCardNumber: 1,
            address: 1,
            kyc: 1,
            status: 1,
            role: 1,
            bankAccount: {
                accountName: 1,
                accountNumber: 1,
                bankName: 1,
                ifscCode: 1,
                branch: 1
            }
        }
    });

    const users = await User.aggregate(pipeline);

    return res.status(200).json(
        new ApiResponse(200, users, 'User KYC and bank details fetched successfully')
    );
});
