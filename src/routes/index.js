import express from 'express';
import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = express.Router();

/**
 * Main API Routes registry
 */
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// Mounted at /api/v1
router.use('/', authRoutes); // Handles /register/user, /login/user, /profile, /kyc/submit
router.use('/products', productRoutes);
router.use('/admin', adminRoutes);

export default router;
