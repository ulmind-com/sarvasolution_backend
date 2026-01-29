import User from '../../models/User.model.js';
import BankAccount from '../../models/BankAccount.model.js';
import { uploadToCloudinary } from '../../services/cloudinary.service.js';
import { mailer } from '../../services/mail.service.js';

/**
 * Handle KYC submission (One-time)
 */
export const submitKYC = async (req, res) => {
    try {
        const userId = req.user._id;
        const body = req.body || {};
        const files = req.files || {};

        let {
            aadhaarNumber,
            panCardNumber,
            bankDetails
        } = body;

        // Find user and check KYC status
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Enforce "Only Once" rule
        if (user.kyc && ['pending', 'verified'].includes(user.kyc.status)) {
            return res.status(400).json({
                success: false,
                message: `KYC submission is already ${user.kyc.status}. You cannot update it now.`
            });
        }

        // Validate required text fields
        if (!aadhaarNumber || !panCardNumber) {
            return res.status(400).json({
                success: false,
                message: 'Aadhaar Number and PAN Card Number are required for KYC.'
            });
        }

        // Validate required images
        if (!files.aadhaarFront || !files.aadhaarBack || !files.panImage) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all 3 required documents: Aadhaar Front, Aadhaar Back, and PAN Image.'
            });
        }

        // Handle Bank Details (if provided)
        try {
            if (typeof bankDetails === 'string' && bankDetails.trim().startsWith('{')) {
                bankDetails = JSON.parse(bankDetails);
            }
        } catch (e) {
            console.error('Error parsing bankDetails in KYC:', e);
        }

        // Upload images to Cloudinary
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

        // Update User KYC Info
        user.kyc = {
            status: 'pending',
            aadhaarNumber,
            aadhaarFront: uploadResults.aadhaarFront,
            aadhaarBack: uploadResults.aadhaarBack,
            panImage: uploadResults.panImage,
            submittedAt: new Date()
        };
        // Also update the main panCardNumber if it matches our validation
        if (panCardNumber) user.panCardNumber = panCardNumber.toUpperCase();

        await user.save();

        // Send KYC Submission Email (Non-blocking)
        mailer.sendKYCSubmission(user).catch(err => console.error('KYC submission mail error:', err));

        // Update or Create Bank Account
        if (bankDetails && bankDetails.accountNumber) {
            let bankAccount = await BankAccount.findOne({ userId });
            if (bankAccount) {
                Object.assign(bankAccount, bankDetails);
                await bankAccount.save();
            } else {
                bankAccount = new BankAccount({ ...bankDetails, userId });
                await bankAccount.save();
            }
        }

        res.status(200).json({
            success: true,
            message: 'KYC submitted successfully. It is now pending verification by admin.',
            data: {
                kycStatus: 'pending',
                submittedAt: user.kyc.submittedAt
            }
        });

    } catch (error) {
        console.error('KYC submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during KYC submission',
            error: error.message
        });
    }
};
