import Franchise from '../../models/Franchise.model.js';
import { generateVendorId } from '../../services/vendorId.service.js';
import { sendWelcomeEmail, sendStatusEmail } from '../../services/email.service.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import bcrypt from 'bcryptjs';

/**
 * @desc    Create a new franchise
 * @route   POST /api/v1/admin/franchise/create
 * @access  Admin
 */
export const createFranchise = asyncHandler(async (req, res) => {
    const {
        name, shopName, email, phone, password,
        city, shopAddress
    } = req.body;

    // Vendor ID Auto-generation
    const vendorId = await generateVendorId();

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    const franchise = await Franchise.create({
        vendorId,
        name,
        shopName,
        email,
        phone,
        password: hashedPassword,
        city,
        shopAddress,
        createdBy: req.user._id
    });

    // Send Welcome Email (Non-blocking)
    const emailSent = await sendWelcomeEmail({
        name, shopName, email, vendorId, password, shopAddress, city
    });

    // Sanitize response
    const createdFranchise = franchise.toObject();
    delete createdFranchise.password;

    return res.status(201).json(
        new ApiResponse(201, { franchise: createdFranchise, emailSent }, 'Franchise created successfully')
    );
});

/**
 * @desc    Get all franchises with filters
 * @route   GET /api/v1/admin/franchise/list
 * @access  Admin
 */
export const listFranchises = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        status,
        city,
        search,
        sortBy = 'createdAt',
        order = 'desc'
    } = req.query;

    const query = { deletedAt: null };

    if (status) query.status = status;
    if (city) query.city = city;

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { shopName: { $regex: search, $options: 'i' } },
            { vendorId: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    const sortOptions = { [sortBy]: order === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const franchises = await Franchise.find(query)
        .select('-password')
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit));

    const total = await Franchise.countDocuments(query);

    // Statistics
    const statistics = await Franchise.aggregate([
        { $match: { deletedAt: null } },
        {
            $group: {
                _id: null,
                totalActive: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
                totalBlocked: { $sum: { $cond: [{ $eq: ["$status", "blocked"] }, 1, 0] } },
                uniqueCities: { $addToSet: "$city" }
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            franchises,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(total / limit),
                totalFranchises: total,
                limit: Number(limit)
            },
            statistics: statistics[0] ? {
                ...statistics[0],
                uniqueCities: statistics[0].uniqueCities.length,
                _id: undefined
            } : {}
        }, 'Franchises fetched successfully')
    );
});

/**
 * @desc    Get single franchise details
 * @route   GET /api/v1/admin/franchise/:franchiseId
 * @access  Admin
 */
export const getFranchiseDetails = asyncHandler(async (req, res) => {
    const franchise = await Franchise.findById(req.params.franchiseId)
        .select('-password')
        .populate('createdBy', 'fullName memberId');

    if (!franchise) throw new ApiError(404, 'Franchise not found');

    return res.status(200).json(
        new ApiResponse(200, { franchise }, 'Franchise details fetched')
    );
});

/**
 * @desc    Update franchise details
 * @route   PUT /api/v1/admin/franchise/update/:franchiseId
 * @access  Admin
 */
export const updateFranchise = asyncHandler(async (req, res) => {
    const { franchiseId } = req.params;
    const updates = req.body;

    // Prevent restricted field updates
    delete updates.vendorId;
    delete updates.role;
    delete updates.password; // Use separate pwd reset flow
    delete updates.isBlocked; // Use block/unblock endpoints

    const franchise = await Franchise.findById(franchiseId);
    if (!franchise) throw new ApiError(404, 'Franchise not found');

    // Uniqueness checks if changed
    if (updates.email && updates.email !== franchise.email) {
        const exists = await Franchise.findOne({ email: updates.email });
        if (exists) throw new ApiError(409, 'Email already in use');
    }
    if (updates.phone && updates.phone !== franchise.phone) {
        const exists = await Franchise.findOne({ phone: updates.phone });
        if (exists) throw new ApiError(409, 'Phone already in use');
    }

    Object.assign(franchise, updates);
    await franchise.save();

    return res.status(200).json(
        new ApiResponse(200, franchise, 'Franchise updated successfully')
    );
});

/**
 * @desc    Block franchise
 * @route   PATCH /api/v1/admin/franchise/block/:franchiseId
 * @access  Admin
 */
export const blockFranchise = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    if (!reason || reason.length < 5) throw new ApiError(400, 'Valid reason required');

    const franchise = await Franchise.findById(req.params.franchiseId);
    if (!franchise) throw new ApiError(404, 'Franchise not found');

    franchise.isBlocked = true;
    franchise.status = 'blocked';
    franchise.blockedAt = new Date();
    franchise.blockedBy = req.user._id;
    franchise.blockReason = reason;

    await franchise.save();

    const emailSent = await sendStatusEmail(franchise, 'blocked', reason);

    return res.status(200).json(
        new ApiResponse(200, { franchise, emailSent }, 'Franchise blocked')
    );
});

/**
 * @desc    Unblock franchise
 * @route   PATCH /api/v1/admin/franchise/unblock/:franchiseId
 * @access  Admin
 */
export const unblockFranchise = asyncHandler(async (req, res) => {
    const franchise = await Franchise.findById(req.params.franchiseId);
    if (!franchise) throw new ApiError(404, 'Franchise not found');

    franchise.isBlocked = false;
    franchise.status = 'active';
    franchise.blockedAt = null;
    franchise.blockReason = null;
    franchise.blockedBy = null;

    await franchise.save();

    const emailSent = await sendStatusEmail(franchise, 'unblocked');

    return res.status(200).json(
        new ApiResponse(200, { franchise, emailSent }, 'Franchise unblocked')
    );
});

/**
 * @desc    Soft Delete franchise
 * @route   DELETE /api/v1/admin/franchise/:franchiseId
 * @access  Admin
 */
export const deleteFranchise = asyncHandler(async (req, res) => {
    const franchise = await Franchise.findById(req.params.franchiseId);
    if (!franchise) throw new ApiError(404, 'Franchise not found');

    // Hard delete check could go here if implemented

    franchise.deletedAt = new Date();
    franchise.status = 'deleted';

    // Free up unique fields for re-use if needed, or append deleted tag
    franchise.email = `${franchise.email}.deleted.${Date.now()}`;
    franchise.phone = `${franchise.phone}.deleted.${Date.now()}`;

    await franchise.save();

    return res.status(200).json(
        new ApiResponse(200, {}, 'Franchise deleted successfully')
    );
});
