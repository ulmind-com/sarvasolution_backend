import express from 'express';
import { getBVSummary, getFundsStatus, requestPayout, getWalletInfo, getTree, getPayouts, getBonusStatus, getFastTrackBonusStatus, getStarMatchingBonusStatus } from '../../../controllers/user/userFinancial.controller.js';
import { getUserProducts, getProductDetails } from '../../../controllers/user/product.controller.js';
import authMiddleware from '../../../middlewares/auth/authMiddleware.js';

const router = express.Router();

// Public Routes (No Authentication Required)
router.get('/products/:productId', getProductDetails);

// Protected Routes (Authentication Required)
router.use(authMiddleware);

router.get('/bv-summary', getBVSummary);
router.get('/funds-status', getFundsStatus);
router.get('/wallet', getWalletInfo);
router.get('/tree', getTree);
router.get('/tree_view', getTree); // Alias for easy tree implementation
router.get('/tree/:memberId', getTree);
router.get('/payouts', getPayouts);
router.get('/bonus-status', getBonusStatus); // Combined (Legacy/Overview)
router.get('/fast-track-status', getFastTrackBonusStatus); // New: Fast Track Specific
router.get('/star-matching-status', getStarMatchingBonusStatus); // New: Star Matching Specific
router.post('/request-payout', requestPayout);

// Product Browsing (authenticated)
router.get('/products', getUserProducts);

import { getDirectTeam, getCompleteTeam } from '../../../controllers/user/user.controller.js';
import { activateUser } from '../../../controllers/user/activate_user.controller.js';

router.post('/activate', activateUser);
router.get('/direct-team', getDirectTeam); // New Route for Direct Team List
router.get('/team/complete', getCompleteTeam); // Recursively fetch complete team by leg

export default router;
