import User from '../../models/User.model.js';
import BankAccount from '../../models/BankAccount.model.js';
import jwt from 'jsonwebtoken';
import Configs from '../../config/config.js';
import chalk from 'chalk';

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
    // Extreme left spillover (default)
    return await findExtremeLeftPosition(sponsor);
}

// Find extreme left available position (spillover)
async function findExtremeLeftPosition(parentUser) {
    let current = parentUser;

    while (true) {
        // Check left child first
        if (!current.leftChild) {
            return { parentId: current.memberId, position: 'left' };
        }

        // Check right child if strictly balanced or some other rule, but usually "extreme left" implies going left down the left most leg. 
        // However, the prompt's spillover logic example suggests a simple traversal.
        // Let's follow the prompt's logic: if prefered failed, go deep left? 
        // Prompt says: "If no preference or position taken, use spillover logic... Extreme left spillover (default)"
        // The prompt's implementation of findExtremeLeftPosition checks left then right of the *current* node?
        // Wait, the prompt code:
        // if (!current.leftChild) return ... left
        // if (!current.rightChild) return ... right
        // current = await User.findById(current.leftChild)
        // This logic fills the parent's immediate left, then immediate right, THEN moves to the LEFT child to repeat.
        // This creates a "Power Leg" on the left side where everyone gets filled 2 wide but only down the left axis.

        if (!current.rightChild) {
            return { parentId: current.memberId, position: 'right' };
        }

        // Move to left child and continue
        current = await User.findById(current.leftChild);
    }
}

// Update PV up the genealogy tree
async function updateUplinePV(parentMemberId, position, pv) {
    let current = await User.findOne({ memberId: parentMemberId });

    while (current) {
        // Update left or right leg PV
        if (position === 'left') {
            current.leftLegPV += pv;
        } else {
            current.rightLegPV += pv;
        }

        current.totalPV = current.leftLegPV + current.rightLegPV + current.personalPV;
        await current.save();

        // Move to parent and continue
        if (!current.parentId) break;

        const parent = await User.findOne({ memberId: current.parentId });
        position = current.position; // Update position for next iteration (this node is LEFT or RIGHT of the parent)
        current = parent;
    }
}

export const register = async (req, res) => {
    try {
        const {
            username,
            email,
            password,
            fullName,
            phone,
            sponsorId,
            joiningPackage,
            preferredPosition, // 'left' or 'right' (optional)
            bankDetails,
            address
        } = req.body;

        console.log(bankDetails);

        // Validation
        if (!username || !email || !password || !fullName || !phone || !sponsorId || !joiningPackage) {
            if (Configs.NODE_ENV == 'development') {
                console.log(chalk.bgRed('All fields are required!'));
            }
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email or username'
            });
        }

        // Verify sponsor exists
        const sponsor = await User.findOne({ memberId: sponsorId });
        if (!sponsor) {
            return res.status(400).json({
                success: false,
                message: 'Invalid sponsor ID'
            });
        }

        // Find available position in binary tree
        const placement = await findAvailablePosition(sponsorId, preferredPosition);

        // Generate unique member ID
        const memberId = await User.generateMemberId();

        // Set PV based on joining package (10% of package amount)
        const personalPV = joiningPackage * 0.1;

        // Create new user
        const newUser = new User({
            username,
            email,
            password,
            fullName,
            phone,
            memberId,
            sponsorId,
            parentId: placement.parentId,
            position: placement.position,
            joiningPackage,
            personalPV,
            totalPV: personalPV,
            address,
            dailyCap: joiningPackage * 5, // Example: 5x joining package
            weeklyCap: joiningPackage * 30,
            monthlyCap: joiningPackage * 100
        });

        await newUser.save();

        const newBankAccount = new BankAccount({ ...bankDetails, userId: newUser._id });
        await newBankAccount.save();

        // Update parent's child reference
        const parent = await User.findOne({ memberId: placement.parentId });
        if (placement.position === 'left') {
            parent.leftChild = newUser._id;
        } else {
            parent.rightChild = newUser._id;
        }
        await parent.save();

        // Update upline PVs (propagate up the tree)
        await updateUplinePV(placement.parentId, placement.position, personalPV);

        // Generate JWT token
        const token = jwt.sign(
            { userId: newUser._id, memberId: newUser.memberId },
            process.env.JWT_SECRET || 'secret', // Fallback for dev
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                memberId: newUser.memberId,
                username: newUser.username,
                email: newUser.email,
                sponsorId: newUser.sponsorId,
                parentId: newUser.parentId,
                position: newUser.position,
                token
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
};
