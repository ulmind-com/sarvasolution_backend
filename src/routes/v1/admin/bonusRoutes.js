import { Router } from 'express';
import * as bonusController from '../../../controllers/admin/bonus.controller.js';
import authMiddleware from '../../../middlewares/auth/authMiddleware.js';
import adminMiddleware from '../../../middlewares/auth/adminMiddleware.js';

const router = Router();

// All admin bonus routes require authentication and admin role
router.use(authMiddleware, adminMiddleware);

router.get('/repurchase-pool', bonusController.getBonusPools);
router.get('/repurchase-qualifiers/:poolId', bonusController.getPoolQualifiers);
router.get('/repurchase-history', bonusController.getAllRepurchaseHistory);
router.get('/live-qualifiers', bonusController.getLiveQualifiers);
router.post('/trigger-repurchase-distribution', bonusController.triggerManualDistribution);

export default router;
