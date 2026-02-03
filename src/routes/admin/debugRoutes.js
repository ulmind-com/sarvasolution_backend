import express from 'express';
import { getSystemStatus, seedSystem } from '../../controllers/admin/debug.controller.js';
import authMiddleware from '../../middlewares/authMiddleware.js';
import adminMiddleware from '../../middlewares/adminMiddleware.js';

const router = express.Router();

// Protected by Admin Auth
router.use(authMiddleware, adminMiddleware);

router.get('/status', getSystemStatus);
router.post('/seed', seedSystem);

export default router;
