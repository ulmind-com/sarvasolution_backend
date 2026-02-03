import { ApiError } from '../utils/ApiError.js';
import Product from '../models/Product.model.js';

export const validateProductInput = async (req, res, next) => {
    try {
        const {
            productName,
            description,
            price,
            mrp,
            bv,
            pv,
            hsnCode,
            category,
            stockQuantity
        } = req.body;

        // 1. Basic Required Fields Check (Manually for clearer errors before Mongoose)
        if (!productName || !description || !price || !mrp || !hsnCode || !category) {
            throw new ApiError(400, 'Missing required fields: Name, Description, Price, MRP, HSN, Category are mandatory.');
        }

        // 2. Numeric Validations
        if (Number(price) < 0 || Number(mrp) < 0 || Number(bv) < 0 || Number(pv) < 0) {
            throw new ApiError(400, 'Price, MRP, BV, and PV must be positive numbers.');
        }

        // 3. Logic: MRP vs Price
        if (Number(mrp) < Number(price)) {
            throw new ApiError(400, 'MRP cannot be less than the Selling Price.');
        }

        // 4. Logic: BV vs Price (Business Rule: BV usually shouldn't exceed price excessively, 
        // though strictly it can depending on strategy. Here we warn/block if unrealistic)
        if (Number(bv) > Number(price)) {
            throw new ApiError(400, 'Business Volume (BV) cannot exceed Product Price.');
        }

        // 5. HSN Format
        if (!/^[0-9]{6,8}$/.test(hsnCode)) {
            throw new ApiError(400, 'Invalid HSN Code. Must be 6-8 digits.');
        }

        // 6. Category Enum
        const validCategories = [
            'aquaculture', 'agriculture', 'personal care',
            'health care', 'home care', 'luxury goods'
        ];
        if (!validCategories.includes(category)) {
            throw new ApiError(400, `Invalid category. Allowed: ${validCategories.join(', ')}`);
        }

        // 7. Duplicate Name Check (Exclude current product if updating)
        const existingProduct = await Product.findOne({ productName: productName.trim() });
        if (existingProduct) {
            // If updating, check if ID matches
            if (req.params.productId && existingProduct._id.toString() === req.params.productId) {
                // Same product, allowed
            } else {
                throw new ApiError(409, 'Product with this name already exists.');
            }
        }

        next();
    } catch (error) {
        next(error);
    }
};
