import express from 'express';
import {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    approveProduct,
    toggleProductStatus
} from '../../controllers/admin/product.controller.js';

import { uploadProductImage } from '../../middlewares/cloudinaryUpload.js';
import { validateProductInput } from '../../middlewares/productValidation.js';
import authMiddleware from '../../middlewares/authMiddleware.js';
import adminMiddleware from '../../middlewares/adminMiddleware.js';

const router = express.Router();

// Apply auth & admin check to all routes
router.use(authMiddleware, adminMiddleware);

// Create
router.post('/create', uploadProductImage, validateProductInput, createProduct);

// Read
router.get('/list', getAllProducts);
router.get('/:productId', getProductById);

// Update
router.put('/update/:productId', uploadProductImage, validateProductInput, updateProduct);

// Status & Approval
router.patch('/approve/:productId', approveProduct);
router.patch('/toggle-status/:productId', toggleProductStatus);

// Delete (Soft)
router.delete('/:productId', deleteProduct);

export default router;
