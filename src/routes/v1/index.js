import express from 'express';
import adminRoutes from './admin/index.js';
import franchiseRoutes from './franchise/index.js';
import userRoutes from './user/index.js';
import authRoutes from './public/auth.routes.js';
import productRoutes from './public/product.routes.js';

const router = express.Router();

/**
 * Public Routes
 */
router.use('/', authRoutes);
router.use('/products', productRoutes);

/**
 * Protected Module Routes
 */
router.use('/admin', adminRoutes);
router.use('/franchise', franchiseRoutes);
router.use('/user', userRoutes);

export default router;
