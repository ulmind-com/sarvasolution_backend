import Franchise from '../../models/Franchise.model.js';
import { generateVendorId } from '../../services/vendorId.service.js';
import { sendWelcomeEmail, sendStatusEmail } from '../../services/email.service.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import bcrypt from 'bcryptjs';

export const createFranchise = asyncHandler(async (req, res) => {
    const { name, shopName, email, phone, password, city, shopAddress } = req.body;

    const existingEmail = await Franchise.findOne({ email });
    if (existingEmail) throw new ApiError(409, "Email already registered");

    const existingPhone = await Franchise.findOne({ phone });
    if (existingPhone) throw new ApiError(409, "Phone number already in use");

    const vendorId = await generateVendorId();

    const hashedPassword = await bcrypt.hash(password, 10);

    const franchise = await Franchise.create({
        vendorId,
        name,
        shopName,
        email: email.toLowerCase(),
        phone,
        password: hashedPassword,
        city,
        shopAddress,
        createdBy: req.user._id
    });

    const emailSent = await sendWelcomeEmail({
        vendorId,
        name,
        shopName,
        email,
        password,
        city,
        shopAddress
    });

    const createdFranchise = await Franchise.findById(franchise._id).select('-password');

    return res.status(201).json(
        new ApiResponse(201, {
            franchise: createdFranchise,
            emailSent
        }, "Franchise created successfully")
    );
});

export const listFranchises = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, city, search } = req.query;
    const query = { deletedAt: null };

    if (status) query.status = status;
    if (city) query.city = city;
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { shopName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { vendorId: { $regex: search, $options: 'i' } }
        ];
    }

    const franchises = await Franchise.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await Franchise.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(200, {
            franchises,
            pagination: {
                total,
                currentPage: Number(page),
                totalPages: Math.ceil(total / limit)
            }
        }, "Franchises fetched successfully")
    );
});

export const updateFranchise = asyncHandler(async (req, res) => {
    const { franchiseId } = req.params;
    const updates = req.body;

    // Prevent updating immutable fields
    delete updates.vendorId;
    delete updates.password;
    delete updates.role;
    delete updates.email; // Usually email changes require separate verification

    const franchise = await Franchise.findByIdAndUpdate(franchiseId, updates, { new: true }).select('-password');
    if (!franchise) throw new ApiError(404, "Franchise not found");

    return res.status(200).json(
        new ApiResponse(200, franchise, "Franchise updated successfully")
    );
});

export const blockFranchise = asyncHandler(async (req, res) => {
    const { franchiseId } = req.params;
    const { reason } = req.body;

    const franchise = await Franchise.findById(franchiseId);
    if (!franchise) throw new ApiError(404, "Franchise not found");

    franchise.status = 'blocked';
    franchise.isBlocked = true;
    franchise.blockedAt = new Date();
    franchise.blockedBy = req.user._id;
    franchise.blockReason = reason;

    await franchise.save();

    await sendStatusEmail(franchise, 'blocked', reason);

    return res.status(200).json(
        new ApiResponse(200, { _id: franchise._id, status: franchise.status }, "Franchise blocked")
    );
});

export const unblockFranchise = asyncHandler(async (req, res) => {
    const { franchiseId } = req.params;

    const franchise = await Franchise.findById(franchiseId);
    if (!franchise) throw new ApiError(404, "Franchise not found");

    franchise.status = 'active';
    franchise.isBlocked = false;
    franchise.blockedAt = null;
    franchise.blockedBy = null;
    franchise.blockReason = null;

    await franchise.save();

    await sendStatusEmail(franchise, 'unblocked');

    return res.status(200).json(
        new ApiResponse(200, { _id: franchise._id, status: franchise.status }, "Franchise unblocked")
    );
});
