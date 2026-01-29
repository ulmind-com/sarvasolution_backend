import express from 'express';
import { getBVSummary, getFundsStatus, requestPayout, getWalletInfo, getTree } from '../controllers/user/userFinancial.controller.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/bv-summary', getBVSummary);
router.get('/funds-status', getFundsStatus);
router.get('/wallet', getWalletInfo);
router.get('/tree', getTree);
router.get('/tree/:memberId', getTree);
router.post('/request-payout', requestPayout);

export default router;
