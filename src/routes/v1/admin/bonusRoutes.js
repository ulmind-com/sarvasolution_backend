import { Router } from 'express';
import * as bonusController from '../../../controllers/admin/bonus.controller.js';
import { verifyJWT, authorizeRoles } from '../../../middlewares/auth.middleware.js';

const router = Router();

// All admin bonus routes require authentication and admin role
router.use(verifyJWT, authorizeRoles('admin'));

router.get('/repurchase-pool', bonusController.getBonusPools);
router.get('/repurchase-qualifiers/:poolId', bonusController.getPoolQualifiers);
router.get('/repurchase-history', bonusController.getAllRepurchaseHistory);
router.get('/live-qualifiers', bonusController.getLiveQualifiers);
router.post('/trigger-repurchase-distribution', bonusController.triggerManualDistribution);

export default router;
