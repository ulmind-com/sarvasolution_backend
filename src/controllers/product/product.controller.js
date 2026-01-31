import Product from '../../models/Product.model.js';
import { uploadToCloudinary } from '../../services/cloudinary.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

/**
 * Create a new product (Admin only)
 */
export const createProduct = asyncHandler(async (req, res) => {
    const { name, bv, description, price, segment } = req.body;

    // Validation
    if (!name || !bv || !price || !segment) {
        throw new ApiError(400, 'Name, BV, Price, and Segment are required');
    }

    if (!req.file) {
        throw new ApiError(400, 'Product image is required');
    }

    // Upload to Cloudinary
    const image = await uploadToCloudinary(req.file.buffer, 'sarvasolution/products');

    const newProduct = new Product({
        name,
        bv: Number(bv),
        description,
        price: Number(price),
        segment,
        image
    });

    await newProduct.save();

    return res.status(201).json(
        new ApiResponse(201, newProduct, 'Product created successfully')
    );
});

/**
 * Get all active products
 */
export const getProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({ isActive: true });
    return res.status(200).json(
        new ApiResponse(200, products, 'Products fetched successfully')
    );
});

/**
 * Update a product (Admin only)
 */
export const updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, bv, description, price, segment, isActive } = req.body;

    const product = await Product.findById(id);
    if (!product) {
        throw new ApiError(404, 'Product not found');
    }

    // Update fields if provided
    if (name) product.name = name;
    if (bv) product.bv = Number(bv);
    if (description) product.description = description;
    if (price) product.price = Number(price);
    if (segment) product.segment = segment;
    if (isActive !== undefined) product.isActive = isActive;

    if (req.file) {
        const image = await uploadToCloudinary(req.file.buffer, 'sarvasolution/products');
        product.image = image;
    }

    await product.save();

    return res.status(200).json(
        new ApiResponse(200, product, 'Product updated successfully')
    );
});

/**
 * Delete (Soft Delete) a product (Admin only)
 */
export const deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
        throw new ApiError(404, 'Product not found');
    }

    // Soft delete
    product.isActive = false;
    await product.save();

    return res.status(200).json(
        new ApiResponse(200, {}, 'Product deleted (deactivated) successfully')
    );
});
