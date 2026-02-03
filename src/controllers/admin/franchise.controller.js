import Franchise from '../../models/Franchise.model.js';
import { generateVendorId } from '../../services/vendorId.service.js';
import { sendWelcomeEmail, sendStatusEmail } from '../../services/email.service.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import bcrypt from 'bcryptjs';

/**
 * @desc    Create New Franchise (Simplified / Standard)
 * @route   POST /api/v1/admin/franchise/create
 */
export const createFranchise = asyncHandler(async (req, res) => {
    const { name, shopName, email, phone, city, shopAddress, password } = req.body;

    // 1. Validation (Bypass strict checks in simplified mode if fields missing)
    if (!name || !email || !phone) {
        throw new ApiError(400, "Name, Email and Phone are required");
    }

    // 2. Check Uniqueness
    const existing = await Franchise.findOne({ $or: [{ email }, { phone }] });
    if (existing) {
        throw new ApiError(409, "Franchise with email or phone already exists");
    }

    // 3. Generate Vendor ID
    const vendorId = await generateVendorId();

    // 4. Password Handling (Default: abc123)
    const rawPassword = password || "abc123";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // 5. Create Franchise
    const franchise = await Franchise.create({
        vendorId,
        name,
        shopName: shopName || `${name}'s Shop`,
        email: email.toLowerCase(),
        phone,
        password: hashedPassword,
        city: city || 'Unknown',
        shopAddress: shopAddress || { street: 'Pending', state: 'Pending', pincode: '000000' },
        status: 'active',
        isBlocked: false,
        createdBy: req.user._id,
        role: 'franchise'
    });

    // 6. Send Email (Fail-safe: don't block creation if email fails)
    try {
        await sendWelcomeEmail({
            vendorId,
            name,
            shopName: franchise.shopName,
            email,
            password: rawPassword, // Send raw password once
            shopAddress: franchise.shopAddress,
            city: franchise.city
        });
    } catch (emailErr) {
        console.error("Welcome email failed:", emailErr.message);
        // Continue, don't throw
    }

    // Return sanitized data
    const createdFranchise = await Franchise.findById(franchise._id).select('-password');

    return res.status(201).json(
        new ApiResponse(201, { franchise: createdFranchise, tempPassword: rawPassword }, "Franchise created successfully")
    );
});

export const listFranchises = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search, status, city } = req.query;
    const query = {};

    if (status) query.status = status;
    if (city) query.city = city;
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { shopName: { $regex: search, $options: 'i' } },
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
        new ApiResponse(200, { franchises, total, page: Number(page) }, "Franchises fetched")
    );
});

export const getFranchiseDetails = asyncHandler(async (req, res) => {
    const franchise = await Franchise.findById(req.params.franchiseId).select('-password');
    if (!franchise) throw new ApiError(404, "Franchise not found");
    return res.status(200).json(new ApiResponse(200, franchise, "Franchise Details"));
});

export const updateFranchise = asyncHandler(async (req, res) => {
    const { franchiseId } = req.params;
    const updateData = req.body;

    // Prevent password update here? For now allowing basic info update
    delete updateData.password;
    delete updateData.vendorId;

    const franchise = await Franchise.findByIdAndUpdate(franchiseId, updateData, { new: true }).select('-password');
    if (!franchise) throw new ApiError(404, "Franchise not found");

    return res.status(200).json(new ApiResponse(200, franchise, "Franchise updated"));
});

export const deleteFranchise = asyncHandler(async (req, res) => {
    // Soft delete usually better, but for now hard delete? Or status closed?
    // Let's go with hard delete for "Cleanup" or soft delete via status.
    // The previous implementation might have been hard delete.
    const franchise = await Franchise.findByIdAndDelete(req.params.franchiseId);
    if (!franchise) throw new ApiError(404, "Franchise not found");
    return res.status(200).json(new ApiResponse(200, null, "Franchise deleted"));
});

export const listFranchiseRequests = asyncHandler(async (req, res) => {
    // Placeholder for franchise requests/applications if implemented separately
    // For now returning empty or implementation of pending status franchises
    const requests = await Franchise.find({ status: 'pending' });
    return res.status(200).json(new ApiResponse(200, requests, "Requests fetched"));
});

export const updateFranchiseStatus = asyncHandler(async (req, res) => {
    const { franchiseId } = req.params;
    const { status, reason } = req.body;

    const franchise = await Franchise.findById(franchiseId);
    if (!franchise) throw new ApiError(404, "Franchise not found");

    franchise.status = status;
    franchise.isBlocked = (status === 'blocked');
    if (status === 'blocked') {
        franchise.blockedAt = new Date();
        franchise.blockReason = reason;
        franchise.blockedBy = req.user._id;
    } else {
        franchise.isBlocked = false;
        franchise.blockedAt = null;
        franchise.blockReason = null;
    }

    await franchise.save();

    // Send Email
    await sendStatusEmail({
        email: franchise.email,
        name: franchise.name,
        vendorId: franchise.vendorId
    }, status === 'blocked' ? 'blocked' : 'unblocked', reason);

    return res.status(200).json(new ApiResponse(200, franchise, `Franchise ${status}`));
});
