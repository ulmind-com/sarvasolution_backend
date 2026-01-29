import User from '../../models/User.model.js';
import BankAccount from '../../models/BankAccount.model.js';
import { uploadToCloudinary } from '../../services/cloudinary.service.js';

export const updateProfile = async (req, res) => {
    try {
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
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Phone uniqueness check if changing
        if (phone && phone !== user.phone) {
            const phoneExists = await User.findOne({ phone });
            if (phoneExists) {
                return res.status(400).json({ success: false, message: 'Phone number already in use' });
            }
            user.phone = phone;
        }

        // PAN limit check if changing
        if (panCardNumber && panCardNumber.toUpperCase() !== user.panCardNumber) {
            const panCount = await User.countDocuments({ panCardNumber: panCardNumber.toUpperCase() });
            if (panCount >= 3) {
                return res.status(400).json({ success: false, message: 'Maximum 3 accounts allowed per PAN card' });
            }
            user.panCardNumber = panCardNumber.toUpperCase();
        }

        // Update other user fields
        if (fullName) user.fullName = fullName;
        if (email) user.email = email;
        if (username) user.username = username;
        if (address) user.address = { ...user.address, ...address };

        // Handle Profile Picture if provided
        if (req.file) {
            try {
                const uploadResult = await uploadToCloudinary(req.file.buffer, 'sarvasolution/profiles');
                user.profilePicture = uploadResult;
            } catch (uploadError) {
                console.error('Profile picture update error:', uploadError);
            }
        }

        await user.save();

        // Update Bank Account if provided
        if (bankDetails) {
            let bankAccount = await BankAccount.findOne({ userId });
            if (bankAccount) {
                Object.assign(bankAccount, bankDetails);
                await bankAccount.save();
            } else {
                bankAccount = new BankAccount({ ...bankDetails, userId });
                await bankAccount.save();
            }
        }

        const updatedUser = await User.findById(userId).select('-password');
        const updatedBank = await BankAccount.findOne({ userId });

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: updatedUser,
                bankAccount: updatedBank || null
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating profile',
            error: error.message
        });
    }
};
