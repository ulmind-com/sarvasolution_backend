import User from '../../models/User.model.js';
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
            username,
            email,
            password,
            fullName,
            phone,
            sponsorId,
            joiningPackage,
            preferredPosition,
            bankDetails,
            address
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
            console.error('Error parsing JSON fields in body:', e);
        }

        // Validation
        if (!username || !email || !password || !fullName || !phone || !sponsorId || !joiningPackage) {
            return res.status(400).json({
                success: false,
                message: 'All fields (username, email, password, fullName, phone, sponsorId, joiningPackage) are required. Please check if your request method is multipart/form-data and includes these fields.',
                debug: { bodyReceivedKeys: Object.keys(body) }
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
                message: 'Invalid sponsor ID. Sponsor does not exist.'
            });
        }

        // Handle Profile Picture Upload
        let profilePicture = {
            url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT11ii7P372sU9BZPZgOR6ohoQbBJWbkJ0OVA&s',
            publicId: null
        };

        if (req.file) {
            try {
                const uploadResult = await uploadToCloudinary(req.file.buffer, 'sarvasolution/profiles');
                profilePicture = uploadResult;
            } catch (uploadError) {
                console.error('Cloudinary upload error:', uploadError);
            }
        }

        // Find available position in binary tree
        const placement = await findAvailablePosition(sponsorId, preferredPosition);

        // Generate unique member ID
        const memberId = await User.generateMemberId();

        // Set PV based on joining package (10% of package amount)
        const personalPV = Number(joiningPackage) * 0.1;

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
            joiningPackage: Number(joiningPackage),
            personalPV,
            totalPV: personalPV,
            address: address || {},
            profilePicture,
            dailyCap: Number(joiningPackage) * 5,
            weeklyCap: Number(joiningPackage) * 30,
            monthlyCap: Number(joiningPackage) * 100
        });

        await newUser.save();

        const bankAccountData = bankDetails || {};
        const newBankAccount = new BankAccount({ ...bankAccountData, userId: newUser._id });
        await newBankAccount.save();

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
            message: req.file && profilePicture.url.includes('encrypted-tbn0')
                ? 'Registration successful but profile picture upload failed'
                : 'Registration successful',
            data: {
                memberId: newUser.memberId,
                username: newUser.username,
                email: newUser.email,
                token,
                warning: req.file && profilePicture.url.includes('encrypted-tbn0') ? 'Image upload timed out' : null
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
