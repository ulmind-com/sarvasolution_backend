import express from 'express';
import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';
import adminRoutes from './adminRoutes.js';
import userRoutes from './userRoutes.js';
import franchiseRoutes from './franchiseRoutes.js';
import adminProductRoutes from './admin/productRoutes.js';
import adminFranchiseRoutes from './admin/franchiseRoutes.js';
import adminSaleRoutes from './admin/saleRoutes.js';

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
router.use('/franchise', franchiseRoutes);
router.use('/admin/product', adminProductRoutes);
router.use('/admin/franchise', adminFranchiseRoutes);
router.use('/admin/sales', adminSaleRoutes);

export default router;
