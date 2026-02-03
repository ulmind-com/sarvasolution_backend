import Product from '../../models/Product.model.js';
import StockTransaction from '../../models/StockTransaction.model.js';
import GSTCalculator from '../../services/gst.service.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { uploadProductImage } from '../../middlewares/cloudinaryUpload.js'; // Ensure existing middleware is used if provided, else manual bypass handled in logic?
// Actually upload happens in route middleware. Request just gets req.file.

export const createProduct = asyncHandler(async (req, res) => {
    try {
        const {
            productName, description, price, mrp, productDP,
            gstRate, bv, pv, hsnCode, batchNo, category, stockQuantity
        } = req.body;

        // 1. Validation Bypass / Defaults
        if (!productName || !price || !mrp) {
            throw new ApiError(400, "Product Name, Price, and MRP are required.");
        }

        // 2. GST Calculation
        const taxInfo = GSTCalculator.calculate(price, gstRate || 18);

        // 3. Image Handling (Bypass if dev/missing)
        let image = {
            url: 'https://via.placeholder.com/400x400.png?text=No+Image',
            publicId: 'placeholder'
        };

        if (req.file && req.file.path) {
            image = {
                url: req.file.path,
                publicId: req.file.filename
            };
        } else if (process.env.NODE_ENV === 'development' || true) {
            // Force allow placeholder for testing
            // "true" condition forces bypass for now as per "EMERGENCY BYPASS" request
        }

        // 4. Create Product
        const product = await Product.create({
            productName,
            description: description || `Description for ${productName}`,
            price,
            productDP: productDP || price, // Fallback
            mrp,
            gstRate: taxInfo.gstRate,
            cgstRate: taxInfo.cgstRate,
            sgstRate: taxInfo.sgstRate,
            igstRate: taxInfo.igstRate,
            gstAmount: taxInfo.gstAmount,
            finalPriceIncGST: taxInfo.finalPriceIncGST,
            bv: bv || 0,
            pv: pv || 0,
            hsnCode: hsnCode || '000000',
            batchNo: batchNo || `BATCH-${Date.now()}`,
            category: category || 'aquaculture',
            stockQuantity: stockQuantity || 0,
            productImage: image,
            isActive: true, // Auto-active
            isApproved: true
        });

        // 5. Initial Stock Log
        if (Number(stockQuantity) > 0) {
            await StockTransaction.create({
                product: product._id,
                transactionType: 'add',
                quantity: Number(stockQuantity),
                previousStock: 0,
                newStock: Number(stockQuantity),
                reason: 'Initial Stock',
                performedBy: req.user._id
            });
        }

        return res.status(201).json(
            new ApiResponse(201, product, "Product created successfully")
        );
    } catch (error) {
        // Handle unique constraint
        if (error.code === 11000) {
            throw new ApiError(409, "Product with this name or batch number already exists");
        }
        throw error;
    }
});

export const getAllProducts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search, category } = req.query;
    const query = { deletedAt: null };

    if (search) query.$text = { $search: search };
    if (category) query.category = category;

    const products = await Product.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await Product.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(200, { products, total, page: Number(page) }, "Products fetched")
    );
});

export const updateProduct = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { price, gstRate } = req.body;

    // If price/tax changes, re-calc GST
    let updateData = { ...req.body };

    if (price || gstRate) {
        // We need existing values if partial update, but for simplicity assuming full re-calc if provided
        // Better: Fetch, Merge, Recalc.
        const product = await Product.findById(productId);
        if (!product) throw new ApiError(404, "Product not found");

        const newPrice = price !== undefined ? price : product.price;
        const newRate = gstRate !== undefined ? gstRate : product.gstRate;

        const taxInfo = GSTCalculator.calculate(newPrice, newRate);
        Object.assign(updateData, {
            gstRate: taxInfo.gstRate,
            cgstRate: taxInfo.cgstRate,
            sgstRate: taxInfo.sgstRate,
            igstRate: taxInfo.igstRate,
            gstAmount: taxInfo.gstAmount,
            finalPriceIncGST: taxInfo.finalPriceIncGST
        });
    }

    if (req.file) {
        updateData.productImage = {
            url: req.file.path,
            publicId: req.file.filename
        };
    }

    const product = await Product.findByIdAndUpdate(productId, updateData, { new: true });

    return res.status(200).json(new ApiResponse(200, product, "Product updated"));
});

export const deleteProduct = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    await Product.findByIdAndUpdate(productId, { deletedAt: new Date(), isActive: false });
    return res.status(200).json(new ApiResponse(200, null, "Product deleted"));
});

export const getProductById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId);
    if (!product || product.deletedAt) throw new ApiError(404, "Product not found");
    return res.status(200).json(new ApiResponse(200, product, "Product details"));
});

export const toggleProductStatus = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId);
    if (!product) throw new ApiError(404, "Product not found");

    product.isActive = !product.isActive;
    await product.save();

    return res.status(200).json(new ApiResponse(200, product, "Status updated"));
});

export const approveProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId);
    if (!product) throw new ApiError(404, "Product not found");

    product.isApproved = true;
    product.isActive = true;
    await product.save();

    return res.status(200).json(new ApiResponse(200, product, "Product approved"));
});

// Stock Management
export const addStock = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { quantityToAdd, reason, batchNo } = req.body;

    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, "Product not found");

    const qty = Number(quantityToAdd);
    product.stockQuantity += qty;
    if (batchNo) product.batchNo = batchNo;
    await product.save();

    await StockTransaction.create({
        product: productId,
        transactionType: 'add',
        quantity: qty,
        previousStock: product.stockQuantity - qty,
        newStock: product.stockQuantity,
        reason: reason || 'Manual Addition',
        performedBy: req.user._id
    });

    return res.status(200).json(new ApiResponse(200, product, "Stock added"));
});

export const removeStock = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { quantityToRemove, reason } = req.body;

    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, "Product not found");

    const qty = Number(quantityToRemove);
    if (product.stockQuantity < qty) throw new ApiError(400, "Insufficient stock");

    product.stockQuantity -= qty;
    await product.save();

    await StockTransaction.create({
        product: productId,
        transactionType: 'remove',
        quantity: qty,
        previousStock: product.stockQuantity + qty,
        newStock: product.stockQuantity,
        reason: reason || 'Manual Removal',
        performedBy: req.user._id
    });

    return res.status(200).json(new ApiResponse(200, product, "Stock removed"));
});

export const getStockHistory = asyncHandler(async (req, res) => {
    const history = await StockTransaction.find({ product: req.params.productId })
        .populate('performedBy', 'username email')
        .sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, history, "History fetched"));
});

export const getLowStockAlerts = asyncHandler(async (req, res) => {
    const products = await Product.find({
        $expr: { $lte: ["$stockQuantity", "$reorderLevel"] },
        isActive: true,
        deletedAt: null
    });
    return res.status(200).json(new ApiResponse(200, products, "Low stock alerts"));
});
