import { Router } from 'express';
import * as bonusController from '../../../controllers/user/bonus.controller.js';
import * as beginnerBonusController from '../../../controllers/user/beginnerBonus.controller.js';
import authMiddleware from '../../../middlewares/auth/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/repurchase-status', bonusController.getRepurchaseStatus);
router.get('/repurchase-history', bonusController.getRepurchaseHistory);

router.get('/beginner-matching-history', beginnerBonusController.getBeginnerBonusHistory);
router.get('/beginner-matching-status', beginnerBonusController.getBeginnerBonusStatus);

export default router;
