import User from '../../models/User.model.js';
import { mailer } from '../../services/mail.service.js';
import BankAccount from '../../models/BankAccount.model.js';
import jwt from 'jsonwebtoken';
import Configs from '../../config/config.js';
import chalk from 'chalk';
import { uploadToCloudinary } from '../../services/cloudinary.service.js';

// Helper function to find available position in binary tree
async function findAvailablePosition(sponsorId, preferredPosition = null) {
    const sponsor = await User.findOne({ memberId: sponsorId });

    if (!sponsor) {
        if (Configs.NODE_ENV == 'development') {
            console.log(chalk.bgRed('Sponsor not found!'));
        }
        throw new Error('Sponsor not found');
    }

    // Check if preferred position is available
    if (preferredPosition === 'left' && !sponsor.leftChild) {
        return { parentId: sponsor.memberId, position: 'left' };
    }

    if (preferredPosition === 'right' && !sponsor.rightChild) {
        return { parentId: sponsor.memberId, position: 'right' };
    }

    // If no preference or position taken, use spillover logic
    return await findExtremeLeftPosition(sponsor);
}

// Find extreme left available position (spillover)
async function findExtremeLeftPosition(parentUser) {
    let current = parentUser;

    while (true) {
        if (!current.leftChild) {
            return { parentId: current.memberId, position: 'left' };
        }

        if (!current.rightChild) {
            return { parentId: current.memberId, position: 'right' };
        }

        // Move to left child and continue
        const nextNodeId = current.leftChild;
        current = await User.findById(nextNodeId);
        if (!current) break;
    }
    throw new Error('Could not find available position in the tree');
}

// Update PV up the genealogy tree
async function updateUplinePV(parentMemberId, position, pv) {
    let current = await User.findOne({ memberId: parentMemberId });

    while (current) {
        if (position === 'left') {
            current.leftLegPV += pv;
        } else {
            current.rightLegPV += pv;
        }

        current.totalPV = current.leftLegPV + current.rightLegPV + current.personalPV;
        await current.save();

        if (!current.parentId) break;

        const parent = await User.findOne({ memberId: current.parentId });
        if (!parent) break;
        position = current.position;
        current = parent;
    }
}

export const register = async (req, res) => {
    try {
        // More resilient body handling
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
            return res.status(400).json({
                success: false,
                message: 'Points required: sponsorId, email, phone, fullName, panCardNumber, password.'
            });
        }

        // Check if phone or username (though we generate it) already exists
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Phone number already registered'
            });
        }

        // Check PAN card usage limit (Max 3)
        const panCount = await User.countDocuments({ panCardNumber: panCardNumber.toUpperCase() });
        if (panCount >= 3) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 3 accounts allowed per PAN card'
            });
        }

        // Verify sponsor exists
        const sponsor = await User.findOne({ memberId: sponsorId });
        if (!sponsor) {
            return res.status(400).json({
                success: false,
                message: 'Invalid sponsor ID. Sponsor does not exist.'
            });
        }

        // Find available position in binary tree (default to spillover/extreme left)
        const placement = await findAvailablePosition(sponsorId);

        // Generate unique member ID
        const memberId = await User.generateMemberId();

        // Default Package Settings (Minimal entry)
        const joiningPackage = 500;
        const personalPV = joiningPackage * 0.1;

        // Create new user
        const newUser = new User({
            username: memberId, // Use memberId as default username
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

        // Update upline PVs (propagate up the tree)
        await updateUplinePV(placement.parentId, placement.position, personalPV);

        // Generate JWT token
        const token = jwt.sign(
            { userId: newUser._id, memberId: newUser.memberId, role: newUser.role },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                memberId: newUser.memberId,
                fullName: newUser.fullName,
                email: newUser.email,
                token
            }
        });

    } catch (error) {
        console.error('Registration error details:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed due to a server error',
            error: error.message
        });
    }
};
