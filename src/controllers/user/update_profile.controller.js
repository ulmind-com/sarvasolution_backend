import User from '../../models/User.model.js';
import BankAccount from '../../models/BankAccount.model.js';
import { uploadToCloudinary } from '../../services/integration/cloudinary.service.js';
import { mailer } from '../../services/integration/mail.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

/**
 * Update user profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const body = req.body || {};

    let {
        fullName,
        email,
        phone,
        panCardNumber,
        address,
        bankDetails,
        username
    } = body;

    // Handle nested objects if sent as strings via FormData
    try {
        if (typeof bankDetails === 'string' && bankDetails.trim().startsWith('{')) {
            bankDetails = JSON.parse(bankDetails);
        }
        if (typeof address === 'string' && address.trim().startsWith('{')) {
            address = JSON.parse(address);
        }
    } catch (e) {
        console.error('Error parsing JSON fields in profile update:', e);
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    const updatedFields = [];

    // Phone uniqueness check
    if (phone && phone !== user.phone) {
        const phoneExists = await User.findOne({ phone });
        if (phoneExists) {
            throw new ApiError(400, 'Phone number already in use');
        }
        user.phone = phone;
        updatedFields.push('Phone Number');
    }

    // PAN limit check
    if (panCardNumber && panCardNumber.toUpperCase() !== user.panCardNumber) {
        const panCount = await User.countDocuments({ panCardNumber: panCardNumber.toUpperCase() });
        if (panCount >= 3) {
            throw new ApiError(400, 'Maximum 3 accounts allowed per PAN card');
        }
        user.panCardNumber = panCardNumber.toUpperCase();
        updatedFields.push('PAN Card Number');
    }

    // Update basic fields
    if (fullName && fullName !== user.fullName) {
        user.fullName = fullName;
        updatedFields.push('Full Name');
    }
    if (email && email !== user.email) {
        user.email = email;
        updatedFields.push('Email Address');
    }
    if (username && username !== user.username) {
        user.username = username;
        updatedFields.push('Username');
    }
    if (address) {
        user.address = { ...user.address, ...address };
        updatedFields.push('Address');
    }

    // Profile Picture
    if (req.file) {
        const uploadResult = await uploadToCloudinary(req.file.buffer, 'sarvasolution/profiles');
        user.profilePicture = uploadResult;
        updatedFields.push('Profile Picture');
    }

    await user.save();

    // Bank Account logic
    if (bankDetails) {
        let bankAccount = await BankAccount.findOne({ userId });
        if (bankAccount) {
            const hasBankDetailsChanged = Object.keys(bankDetails).some(key => bankDetails[key] !== bankAccount[key]);
            if (hasBankDetailsChanged) {
                Object.assign(bankAccount, bankDetails);
                await bankAccount.save();
                updatedFields.push('Bank Details');
            }
        } else {
            bankAccount = new BankAccount({ ...bankDetails, userId });
            await bankAccount.save();
            updatedFields.push('Bank Details');
        }
    }

    // Notifications
    if (updatedFields.length > 0) {
        mailer.sendUpdateNotification(user, updatedFields).catch(err => console.error('Profile update mail error:', err));
    }

    const updatedUser = await User.findById(userId).select('-password');
    const updatedBank = await BankAccount.findOne({ userId });

    return res.status(200).json(
        new ApiResponse(200, {
            user: updatedUser,
            bankAccount: updatedBank || null
        }, 'Profile updated successfully')
    );
});
