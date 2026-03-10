import { Router } from 'express';
import * as bonusController from '../../../controllers/admin/bonus.controller.js';
import * as beginnerBonusController from '../../../controllers/admin/beginnerBonus.controller.js';
import authMiddleware from '../../../middlewares/auth/authMiddleware.js';
import adminMiddleware from '../../../middlewares/auth/adminMiddleware.js';

const router = Router();

// All admin bonus routes require authentication and admin role
router.use(authMiddleware, adminMiddleware);

// --- Repurchase Bonus Routes (Legacy) ---
router.get('/repurchase-pool', bonusController.getBonusPools);
router.get('/repurchase-qualifiers/:poolId', bonusController.getPoolQualifiers);
router.get('/repurchase-history', bonusController.getAllRepurchaseHistory);
router.get('/live-qualifiers', bonusController.getLiveQualifiers);
router.post('/trigger-repurchase-distribution', bonusController.triggerManualDistribution);

// --- Beginner Matching Bonus Routes ---
router.get('/beginner-matching/preview', beginnerBonusController.getBeginnerBonusPreview);
router.post('/beginner-matching/distribute', beginnerBonusController.distributeBeginnerBonus);
router.get('/beginner-matching/history', beginnerBonusController.getBeginnerBonusHistory);
router.get('/beginner-matching/qualifiers', beginnerBonusController.getBeginnerBonusQualifiers);

export default router;
