import express from 'express';
import { getAllUsers, getUserByMemberId, updateUserByAdmin, verifyKYC } from '../controllers/admin/adminUser.controller.js';
import { getDashboardMetrics, processPayout, addManualBV, getPayouts, getAllTransactions, triggerBonusMatching } from '../controllers/admin/adminManager.controller.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import adminMiddleware from '../middlewares/adminMiddleware.js';

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
router.post('/payouts/process', processPayout);
router.get('/transactions', getAllTransactions); // New Audit Route
router.post('/bv/allocate-manual', addManualBV);
router.post('/trigger-bonus', triggerBonusMatching);

export default router;
