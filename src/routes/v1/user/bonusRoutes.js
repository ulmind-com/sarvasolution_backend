import { Router } from 'express';
import * as bonusController from '../../../controllers/user/bonus.controller.js';
import { verifyJWT } from '../../../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyJWT);

router.get('/repurchase-status', bonusController.getRepurchaseStatus);
router.get('/repurchase-history', bonusController.getRepurchaseHistory);

export default router;
