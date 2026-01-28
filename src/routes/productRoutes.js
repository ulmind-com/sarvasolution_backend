import express from 'express';
import { createProduct, getProducts } from '../controllers/product/product.controller.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import adminMiddleware from '../middlewares/adminMiddleware.js';
import { uploadProductImage } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Public route to get products
router.get('/', getProducts);

// Admin only route to create product
router.post('/', authMiddleware, adminMiddleware, uploadProductImage, createProduct);

export default router;
