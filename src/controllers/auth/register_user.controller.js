import User from '../../models/User.model.js';
import { mailer } from '../../services/mail.service.js';
import { mlmService } from '../../services/mlm.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

/**
 * Handle new user registration in SSVPL System
 */
export const register = asyncHandler(async (req, res) => {
    const {
        email,
        password,
        fullName,
        phone,
        sponsorId,
        panCardNumber,
        preferredPosition
    } = req.body;

    // 1. Validation
    if (!email || !password || !fullName || !phone || !sponsorId || !panCardNumber) {
        throw new ApiError(400, 'Required: sponsorId, email, phone, fullName, panCardNumber, password.');
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) throw new ApiError(400, 'Phone number already registered');

    const panCount = await User.countDocuments({ panCardNumber: panCardNumber.toUpperCase() });
    if (panCount >= 3) throw new ApiError(400, 'Maximum 3 accounts allowed per PAN card');

    const sponsor = await User.findOne({ memberId: sponsorId });
    if (!sponsor) throw new ApiError(400, 'Invalid sponsor ID.');

    // 2. Genealogy Placement
    const placement = await mlmService.findAvailablePosition(sponsorId, preferredPosition);
    const memberId = await User.generateMemberId();

    // 3. User Creation (SSVPL default: 500 BV Package)
    const joiningPackageBV = 500;
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
        personalBV: joiningPackageBV,
        totalBV: joiningPackageBV,
        thisMonthBV: joiningPackageBV,
        thisYearBV: joiningPackageBV
    });

    await newUser.save();

    // 4. Update Sponsor's Direct Sponsors count
    if (sponsor) {
        sponsor.directSponsors.count += 1;
        sponsor.directSponsors.members.push(newUser.memberId);
        if (sponsor.directSponsors.count >= 2) {
            sponsor.directSponsors.eligibleForBonuses = true;
        }
        await sponsor.save();
    }

    // 5. Update parent's child reference
    const parentNode = await User.findOne({ memberId: placement.parentId });
    if (parentNode) {
        if (placement.position === 'left') {
            parentNode.leftChild = newUser._id;
        } else {
            parentNode.rightChild = newUser._id;
        }
        await parentNode.save();
    }

    // 5. BV Propagation & Tracking
    await mlmService.propagateBVUpTree(
        newUser._id,
        placement.position,
        joiningPackageBV,
        'joining',
        `REG-${newUser.memberId}`
    );

    // 5.1 Team Count Propagation
    await mlmService.propagateTeamCount(newUser._id, placement.position);

    // 6. Notifications & JWT
    mailer.sendWelcome(newUser).catch(e => console.error('Welcome Email Error:', e));

    const token = jwt.sign(
        { userId: newUser._id, memberId: newUser.memberId, role: newUser.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
    );

    return res.status(201).json(
        new ApiResponse(201, {
            memberId: newUser.memberId,
            fullName: newUser.fullName,
            token
        }, 'Registration successful in SSVPL System')
    );
});
