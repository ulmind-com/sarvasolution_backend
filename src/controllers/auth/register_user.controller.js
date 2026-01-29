import User from '../../models/User.model.js';
import { mailer } from '../../services/mail.service.js';
import { mlmService } from '../../services/mlm.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

/**
 * Handle new user registration
 */
export const register = asyncHandler(async (req, res) => {
    const body = req.body || {};

    let {
        email,
        password,
        fullName,
        phone,
        sponsorId,
        panCardNumber
    } = body;

    // Validation
    if (!email || !password || !fullName || !phone || !sponsorId || !panCardNumber) {
        throw new ApiError(400, 'All fields are required: sponsorId, email, phone, fullName, panCardNumber, password.');
    }

    // Check if phone already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
        throw new ApiError(400, 'Phone number already registered');
    }

    // Check PAN card usage limit (Max 3)
    const panCount = await User.countDocuments({ panCardNumber: panCardNumber.toUpperCase() });
    if (panCount >= 3) {
        throw new ApiError(400, 'Maximum 3 accounts allowed per PAN card');
    }

    // Verify sponsor exists
    const sponsor = await User.findOne({ memberId: sponsorId });
    if (!sponsor) {
        throw new ApiError(400, 'Invalid sponsor ID. Sponsor does not exist.');
    }

    // Find available position in binary tree (Genealogy Logic moved to Service)
    const placement = await mlmService.findAvailablePosition(sponsorId);

    // Generate unique member ID
    const memberId = await User.generateMemberId();

    // Default Package Settings
    const joiningPackage = 500;
    const personalPV = joiningPackage * 0.1;

    // Create new user
    const newUser = new User({
        username: memberId,
        email,
        password,
        fullName,
        phone,
        memberId,
        sponsorId,
        panCardNumber: panCardNumber.toUpperCase(),
        parentId: placement.parentId,
        position: placement.position,
        joiningPackage,
        personalPV,
        totalPV: personalPV,
        dailyCap: joiningPackage * 5,
        weeklyCap: joiningPackage * 30,
        monthlyCap: joiningPackage * 100
    });

    await newUser.save();

    // Send Welcome Email with PDF (Non-blocking)
    mailer.sendWelcome(newUser).catch(err => console.error('Failed to send welcome email:', err));

    // Update parent's child reference
    const parentNode = await User.findOne({ memberId: placement.parentId });
    if (parentNode) {
        if (placement.position === 'left') {
            parentNode.leftChild = newUser._id;
        } else {
            parentNode.rightChild = newUser._id;
        }
        await parentNode.save();
    }

    // Update upline PVs (Logic moved to Service)
    await mlmService.updateUplinePV(placement.parentId, placement.position, personalPV);

    // Generate JWT token
    const token = jwt.sign(
        { userId: newUser._id, memberId: newUser.memberId, role: newUser.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
    );

    return res.status(201).json(
        new ApiResponse(201, {
            memberId: newUser.memberId,
            fullName: newUser.fullName,
            email: newUser.email,
            token
        }, 'Registration successful')
    );
});
