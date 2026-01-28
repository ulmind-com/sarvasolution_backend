import Product from '../../models/Product.model.js';
import { uploadToCloudinary } from '../../services/cloudinary.service.js';

export const createProduct = async (req, res) => {
    try {
        const { name, bv, description, price, segment } = req.body;

        // Validation
        if (!name || !bv || !price || !segment) {
            return res.status(400).json({
                success: false,
                message: 'Name, BV, Price, and Segment are required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Product image is required'
            });
        }

        // Upload to Cloudinary
        let image = { url: '', publicId: '' };
        try {
            const uploadResult = await uploadToCloudinary(req.file.buffer, 'sarvasolution/products');
            image = uploadResult;
        } catch (uploadError) {
            console.error('Product image upload error:', uploadError);
            return res.status(500).json({
                success: false,
                message: 'Failed to upload product image',
                error: uploadError.message
            });
        }

        const newProduct = new Product({
            name,
            bv: Number(bv),
            description,
            price: Number(price),
            segment,
            image
        });

        await newProduct.save();

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: newProduct
        });

    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating product',
            error: error.message
        });
    }
};

export const getProducts = async (req, res) => {
    try {
        const products = await Product.find({ isActive: true });
        res.status(200).json({
            success: true,
            data: products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error fetching products',
            error: error.message
        });
    }
};
