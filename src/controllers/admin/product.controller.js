import Product from '../../models/Product.model.js';
import StockTransaction from '../../models/StockTransaction.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { uploadToCloudinary } from '../../services/integration/cloudinary.service.js';

export const createProduct = asyncHandler(async (req, res) => {
    const {
        productName, description, price, mrp, category, stockQuantity,
        hsnCode, bv, pv, productDP, isFeatured, isActivationPackage,
        cgst, sgst // Tax fields (gst removed)
    } = req.body;

    if (!req.file) {
        throw new ApiError(400, "Product image is required");
    }

    // Upload to Cloudinary using buffer (integration service)
    const productImage = await uploadToCloudinary(req.file.buffer, 'sarvasolution/products');

    const product = await Product.create({
        productName,
        description,
        price,
        mrp,
        category,
        stockQuantity,
        hsnCode,
        bv: Number(bv) || 0,
        pv: Number(pv) || 0,
        productDP: Number(productDP),
        isFeatured,
        isActivationPackage,
        cgst: Number(cgst) || 0,
        sgst: Number(sgst) || 0,
        productImage,
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
        const image = await uploadToCloudinary(req.file.buffer, 'sarvasolution/products');
        updateData.productImage = image;
    }

    // Ensure numeric parsing for updates (gst removed, cgst and sgst kept)
    if (updateData.cgst) updateData.cgst = Number(updateData.cgst);
    if (updateData.sgst) updateData.sgst = Number(updateData.sgst);

    // Mongoose findByIdAndUpdate bypasses pre-save hooks so we need to calc finalPrice manually or use save()
    // Using save() pattern is safer for consistency
    Object.keys(updateData).forEach(key => {
        product[key] = updateData[key];
    });

    await product.save(); // Triggers pre-save hook for finalPrice

    return res.status(200).json(
        new ApiResponse(200, product, "Product updated successfully")
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
        new ApiResponse(200, product, `Product ${product.isActive ? 'activated' : 'deactivated'}`)
    );
});

export const addStock = asyncHandler(async (req, res) => {
    const { quantityToAdd } = req.body;
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
        reason: 'Stock added by admin',
        performedBy: req.user._id
    });

    return res.status(200).json(
        new ApiResponse(200, product, "Stock added successfully")
    );
});

export const removeStock = asyncHandler(async (req, res) => {
    const { quantityToRemove } = req.body;
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
        reason: 'Stock removed by admin',
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


