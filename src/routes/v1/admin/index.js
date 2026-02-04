import express from 'express';
import { getAllUsers, getUserByMemberId, updateUserByAdmin, verifyKYC } from '../../../controllers/admin/adminUser.controller.js';
import { getDashboardMetrics, processPayout, addManualBV, getPayouts, getAllTransactions, triggerBonusMatching, acceptPayout, rejectPayout } from '../../../controllers/admin/adminManager.controller.js';
import { fixDatabaseIssues } from '../../../controllers/admin/fixDatabase.controller.js';
import authMiddleware from '../../../middlewares/auth/authMiddleware.js';
import adminMiddleware from '../../../middlewares/auth/adminMiddleware.js';

import productRoutes from './productRoutes.js';
import franchiseRoutes from './franchiseRoutes.js';
import saleRoutes from './saleRoutes.js';
import requestRoutes from './requestRoutes.js';

const router = express.Router();

// All routes here require both authentication and admin role
router.use(authMiddleware, adminMiddleware);

// User Management
router.get('/users', getAllUsers);
router.get('/users/:memberId', getUserByMemberId);
router.patch('/users/:memberId', updateUserByAdmin);
router.patch('/kyc/verify/:memberId', verifyKYC);

// System Management
router.get('/dashboard-metrics', getDashboardMetrics);
router.get('/payouts', getPayouts);
router.post('/payouts/process', processPayout); // Legacy endpoint for backward compatibility
router.patch('/payouts/:payoutId/accept', acceptPayout); // New: Accept payout
router.patch('/payouts/:payoutId/reject', rejectPayout); // New: Reject payout
router.get('/transactions', getAllTransactions); // New Audit Route
router.post('/bv/allocate-manual', addManualBV);
router.post('/trigger-bonus', triggerBonusMatching);
router.post('/fix-database', fixDatabaseIssues); // Fix data inconsistencies

// Sub-Modules
router.use('/product', productRoutes);
router.use('/franchise', franchiseRoutes);
router.use('/sales', saleRoutes);
router.use('/requests', requestRoutes); // Pluralized to match user preference

export default router;

