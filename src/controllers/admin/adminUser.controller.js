import User from '../../models/User.model.js';
import BankAccount from '../../models/BankAccount.model.js';
import { mailer } from '../../services/mail.service.js';

/**
 * Get all users with basic details
 */
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: error.message
        });
    }
};

/**
 * Get a specific user by memberId
 */
export const getUserByMemberId = async (req, res) => {
    try {
        const { memberId } = req.params;
        const user = await User.findOne({ memberId }).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const bankAccount = await BankAccount.findOne({ userId: user._id });

        res.status(200).json({
            success: true,
            data: {
                user,
                bankAccount: bankAccount || null
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching user details',
            error: error.message
        });
    }
};

/**
 * Admin can update any user's details
 */
export const updateUserByAdmin = async (req, res) => {
    try {
        const { memberId } = req.params;
        const updates = req.body;

        const user = await User.findOne({ memberId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Handle specific unique field updates with validation
        if (updates.phone && updates.phone !== user.phone) {
            const phoneExists = await User.findOne({ phone: updates.phone });
            if (phoneExists) {
                return res.status(400).json({ success: false, message: 'Phone number already in use' });
            }
        }

        if (updates.panCardNumber && updates.panCardNumber.toUpperCase() !== user.panCardNumber) {
            const panCount = await User.countDocuments({ panCardNumber: updates.panCardNumber.toUpperCase() });
            if (panCount >= 3) {
                return res.status(400).json({ success: false, message: 'Maximum 3 accounts allowed per PAN card' });
            }
            updates.panCardNumber = updates.panCardNumber.toUpperCase();
        }

        // Track updates for notification
        const updatedFields = [];
        Object.keys(updates).forEach(key => {
            if (updates[key] !== user[key]) {
                updatedFields.push(key.charAt(0).toUpperCase() + key.slice(1));
            }
        });

        // Apply updates
        Object.assign(user, updates);
        await user.save();

        if (updatedFields.length > 0) {
            mailer.sendUpdateNotification(user, updatedFields).catch(err => console.error('Admin update mail error:', err));
        }

        const updatedUser = await User.findOne({ memberId }).select('-password');

        res.status(200).json({
            success: true,
            message: 'User updated successfully by admin',
            data: updatedUser
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating user',
            error: error.message
        });
    }
};

/**
 * Admin verifies or rejects KYC
 */
export const verifyKYC = async (req, res) => {
    try {
        const { memberId } = req.params;
        const { status, rejectionReason } = req.body;

        if (!['verified', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be "verified" or "rejected".'
            });
        }

        const user = await User.findOne({ memberId });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.kyc || user.kyc.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'No pending KYC found for this user.'
            });
        }

        user.kyc.status = status;
        user.kyc.verifiedAt = status === 'verified' ? new Date() : null;
        user.kyc.rejectionReason = status === 'rejected' ? rejectionReason : null;

        await user.save();

        // Send Status Update Email (Non-blocking)
        mailer.sendKYCStatusUpdate(user, status, rejectionReason).catch(err => console.error('KYC verify mail error:', err));

        res.status(200).json({
            success: true,
            message: `KYC has been ${status} successfully.`,
            data: {
                memberId: user.memberId,
                kycStatus: user.kyc.status
            }
        });

    } catch (error) {
        console.error('KYC verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during KYC verification',
            error: error.message
        });
    }
};
