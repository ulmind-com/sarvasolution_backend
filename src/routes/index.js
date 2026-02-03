import express from 'express';
import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';
import adminRoutes from './adminRoutes.js';
import userRoutes from './userRoutes.js';
import adminProductRoutes from './admin/productRoutes.js';

const router = express.Router();

/**
 * Main API Routes registry
 */
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// Mounted at /api/v1
router.use('/', authRoutes);
router.use('/products', productRoutes);
router.use('/admin', adminRoutes);
router.use('/user', userRoutes);
router.use('/admin/product', adminProductRoutes);

export default router;
