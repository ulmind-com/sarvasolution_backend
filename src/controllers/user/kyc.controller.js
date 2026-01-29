import User from '../../models/User.model.js';
import BankAccount from '../../models/BankAccount.model.js';
import { uploadToCloudinary } from '../../services/cloudinary.service.js';
import { mailer } from '../../services/mail.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

/**
 * Handle KYC submission (One-time)
 */
export const submitKYC = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { aadhaarNumber, panCardNumber, bankDetails: bankDetailsStr } = req.body;
    const files = req.files;

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    // Enforce "Only Once" rule
    if (user.kyc && ['pending', 'verified'].includes(user.kyc.status)) {
        throw new ApiError(400, `KYC submission is already ${user.kyc.status}.`);
    }

    // Validate required files
    if (!files || !files.aadhaarFront || !files.aadhaarBack || !files.panImage) {
        throw new ApiError(400, 'All KYC documents (Aadhaar Front, Aadhaar Back, PAN Image) are required.');
    }

    // Upload to Cloudinary
    const uploadResults = {};
    const uploadPromises = [
        { key: 'aadhaarFront', buffer: files.aadhaarFront[0].buffer },
        { key: 'aadhaarBack', buffer: files.aadhaarBack[0].buffer },
        { key: 'panImage', buffer: files.panImage[0].buffer }
    ].map(async ({ key, buffer }) => {
        const result = await uploadToCloudinary(buffer, `sarvasolution/kyc/${user.memberId}`);
        uploadResults[key] = result;
    });
    await Promise.all(uploadPromises);

    // Update User KYC
    user.kyc = {
        status: 'pending',
        aadhaarNumber,
        panCardNumber: panCardNumber.toUpperCase(),
        aadhaarFront: uploadResults.aadhaarFront,
        aadhaarBack: uploadResults.aadhaarBack,
        panImage: uploadResults.panImage,
        submittedAt: new Date()
    };

    if (panCardNumber) user.panCardNumber = panCardNumber.toUpperCase();
    await user.save();

    // Notification
    mailer.sendKYCSubmission(user).catch(err => console.error('KYC submission mail error:', err));

    // Handle Bank Details
    if (bankDetailsStr) {
        try {
            const bankDetails = JSON.parse(bankDetailsStr);
            let bankAccount = await BankAccount.findOne({ userId });
            if (bankAccount) {
                Object.assign(bankAccount, bankDetails);
                await bankAccount.save();
            } else {
                bankAccount = new BankAccount({ ...bankDetails, userId });
                await bankAccount.save();
            }
        } catch (e) {
            console.error('Bank details sync error:', e);
        }
    }

    return res.status(200).json(
        new ApiResponse(200, user.kyc, 'KYC submitted successfully for verification.')
    );
});
