import Product from '../../models/Product.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

/**
 * @desc    Get products with advanced filtering (User)
 * @route   GET /api/v1/user/products
 * @access  Authenticated User
 */
export const getUserProducts = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 12,
        search,
        category,
        minPrice,
        maxPrice,
        minBV,
        maxBV,
        sortBy = 'price',
        order = 'asc',
        inStock,
        isFeatured
    } = req.query;

    const pipeline = [];

    // 1. Base Match: Active, Approved, Not Deleted
    const matchStage = {
        isActive: true,
        isApproved: true,
        deletedAt: null
    };

    // 2. Dynamic Filtering
    if (category) matchStage.category = category;
    if (isFeatured === 'true') matchStage.isFeatured = true;

    // Price Range
    if (minPrice || maxPrice) {
        matchStage.finalPrice = {};
        if (minPrice) matchStage.finalPrice.$gte = Number(minPrice);
        if (maxPrice) matchStage.finalPrice.$lte = Number(maxPrice);
    }

    // BV Range
    if (minBV || maxBV) {
        matchStage.bv = {};
        if (minBV) matchStage.bv.$gte = Number(minBV);
        if (maxBV) matchStage.bv.$lte = Number(maxBV);
    }

    // Stock Filter
    if (inStock === 'true') {
        matchStage.stockQuantity = { $gt: 0 };
    }

    // Text Search (indexed fields: name, description)
    if (search) {
        matchStage.$text = { $search: search };
    }

    pipeline.push({ $match: matchStage });

    // 3. Sorting
    const sortStage = {};
    if (search) {
        // If searching, sort by score first
        sortStage.score = { $meta: "textScore" };
    }
    // Then user selected sort
    sortStage[sortBy] = order === 'asc' ? 1 : -1;
    pipeline.push({ $sort: sortStage });

    // 4. Projection (Optimize payload)
    pipeline.push({
        $project: {
            productName: 1,
            description: 1, // Maybe truncate?
            price: 1,
            mrp: 1,
            finalPrice: 1,
            discount: 1,
            bv: 1,
            pv: 1,
            category: 1,
            productImage: 1,
            stockQuantity: 1,
            isFeatured: 1,
            hsnCode: 1,
            createdAt: 1,
            isInStock: { $gt: ["$stockQuantity", 0] }, // Compute dynamically
            score: { $meta: "textScore" } // Only if searching
        }
    });

    // 5. Pagination with Facet
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    pipeline.push({
        $facet: {
            products: [
                { $skip: skip },
                { $limit: limitNum }
            ],
            totalCount: [
                { $count: 'count' }
            ],
            // Extra: Aggregations for UI Filters
            availableCategories: [
                { $group: { _id: "$category", count: { $sum: 1 } } }
            ]
        }
    });

    const result = await Product.aggregate(pipeline);
    const { products, totalCount, availableCategories } = result[0];
    const total = totalCount.length > 0 ? totalCount[0].count : 0;

    return res.status(200).json(
        new ApiResponse(200, {
            products,
            pagination: {
                currentPage: pageNum,
                totalPages: Math.ceil(total / limitNum),
                totalProducts: total,
                limit: limitNum,
                hasNextPage: pageNum * limitNum < total
            },
            filters: {
                availableCategories: availableCategories.map(c => ({ category: c._id, count: c.count }))
            }
        }, 'Products fetched successfully')
    );
});

/**
 * @desc    Get single product details with ALL information including stock
 * @route   GET /api/v1/user/products/:productId
 * @access  Public (No authentication required)
 */
export const getProductDetails = asyncHandler(async (req, res) => {
    const { productId } = req.params;

    const product = await Product.findOne({
        _id: productId,
        isActive: true,
        isApproved: true,
        deletedAt: null
    })
        .select('-deletedAt -__v') // Exclude internal fields
        .lean();

    if (!product) {
        throw new ApiError(404, 'Product not found');
    }

    // Add computed fields
    product.isInStock = product.stockQuantity > 0;
    product.stockStatus = product.stockQuantity > 0 ? 'In Stock' : 'Out of Stock';

    // Calculate discount percentage if applicable
    if (product.mrp && product.finalPrice) {
        product.discountPercentage = Math.round(((product.mrp - product.finalPrice) / product.mrp) * 100);
    }

    // Fetch related products (same category)
    const relatedProducts = await Product.find({
        category: product.category,
        _id: { $ne: productId },
        isActive: true,
        isApproved: true,
        deletedAt: null,
        stockQuantity: { $gt: 0 } // Only in-stock related products
    })
        .select('productName finalPrice mrp productImage stockQuantity bv pv')
        .limit(6)
        .lean();

    return res.status(200).json(
        new ApiResponse(200, {
            product,
            relatedProducts
        }, 'Product details fetched successfully')
    );
});
