import Product from '../../models/Product.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import cloudinary from '../../config/cloudinary.js';

/**
 * @desc    Create a new product
 * @route   POST /api/v1/admin/product/create
 * @access  Admin
 */
export const createProduct = asyncHandler(async (req, res) => {
    // Note: Validation is handled by middleware before this
    // Image is handled by cloudinaryUpload middleware - available at req.file

    if (!req.file) {
        throw new ApiError(400, 'Product image is required');
    }

    const {
        productName, description, price, mrp, bv, pv,
        hsnCode, category, stockQuantity, reorderLevel,
        discount, isFeatured, isActivationPackage, batchNo
    } = req.body;

    const newProduct = await Product.create({
        productName,
        description,
        price,
        mrp,
        bv,
        pv,
        hsnCode,
        category,
        stockQuantity: stockQuantity || 0,
        reorderLevel: reorderLevel || 10,
        discount: discount || 0,
        batchNo: batchNo || `BATCH${new Date().getFullYear()}${Math.floor(Math.random() * 1000)}`,
        isFeatured: isFeatured === 'true' || isFeatured === true,
        isActivationPackage: isActivationPackage === 'true' || isActivationPackage === true,
        createdBy: req.user._id,
        productImage: {
            url: req.file.path,
            publicId: req.file.filename
        }
    });

    return res.status(201).json(
        new ApiResponse(201, newProduct, 'Product created successfully')
    );
});

/**
 * @desc    Get all products with filters & pagination
 * @route   GET /api/v1/admin/product/list
 * @access  Admin
 */
export const getAllProducts = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        search,
        category,
        isActive,
        sortBy = 'createdAt',
        order = 'desc'
    } = req.query;

    const query = { deletedAt: null }; // Only non-deleted

    // Filters
    if (search) {
        query.$text = { $search: search };
    }
    if (category) {
        query.category = category;
    }
    if (isActive !== undefined) {
        query.isActive = isActive === 'true';
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    const products = await Product.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('createdBy', 'fullName email');

    const total = await Product.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(200, {
            products,
            pagination: {
                currentPage: pageNum,
                totalPages: Math.ceil(total / limitNum),
                totalProducts: total,
                limit: limitNum
            }
        }, 'Products retrieved successfully')
    );
});

/**
 * @desc    Get single product details
 * @route   GET /api/v1/admin/product/:productId
 * @access  Admin
 */
export const getProductById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId);

    if (!product || product.deletedAt) {
        throw new ApiError(404, 'Product not found');
    }

    return res.status(200).json(
        new ApiResponse(200, product, 'Product fetched successfully')
    );
});

/**
 * @desc    Update product details
 * @route   PUT /api/v1/admin/product/update/:productId
 * @access  Admin
 */
export const updateProduct = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const updates = req.body;

    const product = await Product.findById(productId);

    if (!product || product.deletedAt) {
        throw new ApiError(404, 'Product not found');
    }

    // Handle Image Replacement
    if (req.file) {
        // Delete old image from Cloudinary
        if (product.productImage && product.productImage.publicId) {
            await cloudinary.uploader.destroy(product.productImage.publicId);
        }

        // Set new image
        updates.productImage = {
            url: req.file.path,
            publicId: req.file.filename,
            uploadedAt: new Date()
        };
    }

    // Prevent direct SKU modification (unless specific logic added)
    delete updates.sku;
    delete updates.createdBy;

    // Apply updates
    Object.keys(updates).forEach((key) => {
        product[key] = updates[key];
    });

    await product.save(); // Triggers pre-save hooks (finalPrice calc)

    return res.status(200).json(
        new ApiResponse(200, product, 'Product updated successfully')
    );
});

/**
 * @desc    Soft delete a product
 * @route   DELETE /api/v1/admin/product/:productId
 * @access  Admin
 */
export const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId);

    if (!product || product.deletedAt) {
        throw new ApiError(404, 'Product not found');
    }

    // Soft delete
    product.deletedAt = new Date();
    product.isActive = false;
    await product.save();

    return res.status(200).json(
        new ApiResponse(200, {}, 'Product deleted successfully')
    );
});

/**
 * @desc    Approve a product
 * @route   PATCH /api/v1/admin/product/approve/:productId
 * @access  Admin
 */
export const approveProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId);

    if (!product || product.deletedAt) {
        throw new ApiError(404, 'Product not found');
    }

    product.isApproved = true;
    product.isActive = true; // Auto-activate on approval
    await product.save();

    return res.status(200).json(
        new ApiResponse(200, product, 'Product approved and activated')
    );
});

/**
 * @desc    Toggle product active status
 * @route   PATCH /api/v1/admin/product/toggle-status/:productId
 * @access  Admin
 */
export const toggleProductStatus = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId);

    if (!product || product.deletedAt) {
        throw new ApiError(404, 'Product not found');
    }

    product.isActive = !product.isActive;
    await product.save();

    return res.status(200).json(
        new ApiResponse(200, {
            _id: product._id,
            isActive: product.isActive
        }, `Product ${product.isActive ? 'activated' : 'deactivated'}`)
    );
});
