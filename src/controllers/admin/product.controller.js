import Product from '../../models/Product.model.js';
import StockTransaction from '../../models/StockTransaction.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { uploadOnCloudinary } from '../../utils/cloudinary.js';

export const createProduct = asyncHandler(async (req, res) => {
    const {
        productName, description, price, mrp, category, stockQuantity,
        reorderLevel, sku, hsnCode, bv, pv, isFeatured, isActivationPackage
    } = req.body;

    if (!req.file) {
        throw new ApiError(400, "Product image is required");
    }

    const productImage = await uploadOnCloudinary(req.file.path);
    if (!productImage) {
        throw new ApiError(500, "Failed to upload image");
    }

    const product = await Product.create({
        productName,
        description,
        price,
        mrp,
        category,
        stockQuantity,
        reorderLevel,
        sku,
        hsnCode,
        bv,
        pv,
        isFeatured,
        isActivationPackage,
        productImage: {
            url: productImage.secure_url,
            publicId: productImage.public_id
        },
        createdBy: req.user._id
    });

    return res.status(201).json(
        new ApiResponse(201, product, "Product created successfully")
    );
});

export const getAllProducts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search, category } = req.query;
    const query = { deletedAt: null };

    if (search) {
        query.$text = { $search: search };
    }
    if (category) {
        query.category = category;
    }

    const products = await Product.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await Product.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(200, {
            products,
            pagination: {
                total,
                currentPage: Number(page),
                totalPages: Math.ceil(total / limit)
            }
        }, "Products fetched successfully")
    );
});

export const getProductById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product || product.deletedAt) {
        throw new ApiError(404, "Product not found");
    }
    return res.status(200).json(
        new ApiResponse(200, product, "Product fetched successfully")
    );
});

export const updateProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product || product.deletedAt) {
        throw new ApiError(404, "Product not found");
    }

    const updateData = { ...req.body };

    if (req.file) {
        const image = await uploadOnCloudinary(req.file.path);
        updateData.productImage = {
            url: image.secure_url,
            publicId: image.public_id
        };
    }

    const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
    );

    return res.status(200).json(
        new ApiResponse(200, updatedProduct, "Product updated successfully")
    );
});

export const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    product.deletedAt = new Date();
    product.isActive = false;
    await product.save();

    return res.status(200).json(
        new ApiResponse(200, {}, "Product deleted successfully")
    );
});

export const approveProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new ApiError(404, "Product not found");

    product.isApproved = true;
    await product.save();

    return res.status(200).json(
        new ApiResponse(200, product, "Product approved")
    );
});

export const toggleProductStatus = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new ApiError(404, "Product not found");

    product.isActive = !product.isActive;
    await product.save();

    return res.status(200).json(
        new ApiResponse(200, {
            _id: product._id,
            isActive: product.isActive
        }, `Product ${product.isActive ? 'activated' : 'deactivated'}`)
    );
});

export const addStock = asyncHandler(async (req, res) => {
    const { quantityToAdd, reason, batchNo, referenceNo } = req.body;
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, "Product not found");

    const previousStock = product.stockQuantity;
    product.stockQuantity += Number(quantityToAdd);
    if (product.stockQuantity > 0) product.isInStock = true;

    await product.save();

    await StockTransaction.create({
        product: productId,
        transactionType: 'add',
        quantity: quantityToAdd,
        previousStock,
        newStock: product.stockQuantity,
        reason,
        referenceNo,
        performedBy: req.user._id
    });

    return res.status(200).json(
        new ApiResponse(200, product, "Stock added successfully")
    );
});

export const removeStock = asyncHandler(async (req, res) => {
    const { quantityToRemove, reason, referenceNo } = req.body;
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, "Product not found");

    if (product.stockQuantity < quantityToRemove) {
        throw new ApiError(400, "Insufficient stock");
    }

    const previousStock = product.stockQuantity;
    product.stockQuantity -= Number(quantityToRemove);
    if (product.stockQuantity === 0) product.isInStock = false;

    await product.save();

    await StockTransaction.create({
        product: productId,
        transactionType: 'remove',
        quantity: quantityToRemove,
        previousStock,
        newStock: product.stockQuantity,
        reason,
        referenceNo,
        performedBy: req.user._id
    });

    return res.status(200).json(
        new ApiResponse(200, product, "Stock removed successfully")
    );
});

export const getStockHistory = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const history = await StockTransaction.find({ product: productId })
        .populate('performedBy', 'username email')
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, history, "Stock history fetched")
    );
});

export const getLowStockAlerts = asyncHandler(async (req, res) => {
    const products = await Product.find({
        $expr: { $lte: ["$stockQuantity", "$reorderLevel"] },
        isActive: true,
        deletedAt: null
    }).select('productName stockQuantity reorderLevel');

    return res.status(200).json(
        new ApiResponse(200, products, "Low stock alerts fetched")
    );
});
