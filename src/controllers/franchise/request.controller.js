import ProductRequest from '../../models/ProductRequest.model.js';
import Product from '../../models/Product.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

/**
 * @desc    Browse Admin Inventory (Filtered for Franchise)
 * @route   GET /api/v1/franchise/admin-inventory
 */
export const getAdminInventory = asyncHandler(async (req, res) => {
    const {
        page = 1, limit = 20,
        category, search, minPrice, maxPrice
    } = req.query;

    const query = {
        isActive: true,
        deletedAt: null,
        isApproved: true,
        stockQuantity: { $gt: 0 } // Only in-stock
    };

    if (category) query.category = category;
    if (search) query.$text = { $search: search };
    if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = Number(minPrice);
        if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const products = await Product.find(query)
        .select('_id productId productName category price mrp stockQuantity productImage hsnCode description') // Include _id and productId
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await Product.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(200, {
            products,
            pagination: {
                total, currentPage: Number(page), totalPages: Math.ceil(total / limit)
            }
        }, 'Inventory fetched')
    );
});

/**
 * @desc    Create Product Request
 * @route   POST /api/v1/franchise/product-request/create
 */
export const createRequest = asyncHandler(async (req, res) => {
    const { items, franchiseGSTIN, franchiseAccountNo } = req.body;
    const franchise = req.franchise;

    if (!items || items.length === 0) {
        throw new ApiError(400, 'Items array cannot be empty');
    }

    // Generate Request No
    const currentYear = new Date().getFullYear();
    const count = await ProductRequest.countDocuments();
    const requestNo = `REQ-${currentYear}-${String(count + 1).padStart(5, '0')}`;

    const requestItems = [];
    let estimatedTotal = 0;

    for (const item of items) {
        const product = await Product.findById(item.productId);
        if (!product || !product.isActive) {
            throw new ApiError(400, `Product not available: ${item.productId}`);
        }

        // Optional: Check if admin has enough stock? 
        // Allow request even if stock low? Screenshot implies "In Stock" filter, 
        // but typically request implies "I want this". 
        // For now, let's validate stock > 0 at least to avoid spamming "Out of Stock" items.
        if (product.stockQuantity < item.requestedQuantity) {
            throw new ApiError(400, `Insufficient stock for ${product.productName}. max: ${product.stockQuantity}`);
        }

        requestItems.push({
            product: product._id,
            productId: product.productId,
            requestedQuantity: item.requestedQuantity,
            productDP: product.price,
            productMRP: product.mrp,
            hsnCode: product.hsnCode
        });

        estimatedTotal += (product.price * item.requestedQuantity);
    }

    const newRequest = await ProductRequest.create({
        requestNo,
        franchise: franchise._id,
        franchiseGSTIN: franchiseGSTIN || req.franchise.gstNo, // Optional defaulting
        franchiseAccountNo: franchiseAccountNo || req.franchise.accountNo,
        items: requestItems,
        estimatedTotal,
        status: 'pending'
    });

    // TODO: Send Email Notification to Admin

    return res.status(201).json(
        new ApiResponse(201, { request: newRequest }, 'Request submitted successfully')
    );
});

/**
 * @desc    Get My Requests
 * @route   GET /api/v1/franchise/product-requests
 */
export const getMyRequests = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { franchise: req.franchise._id };

    if (status) query.status = status;

    const requests = await ProductRequest.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await ProductRequest.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(200, {
            requests,
            pagination: { total, currentPage: Number(page) }
        }, 'Requests fetched')
    );
});
