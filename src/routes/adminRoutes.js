import express from 'express';
import { getAllUsers, getUserByMemberId, updateUserByAdmin, verifyKYC } from '../controllers/admin/adminUser.controller.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import adminMiddleware from '../middlewares/adminMiddleware.js';

const router = express.Router();

// All routes here require both authentication and admin role
router.use(authMiddleware, adminMiddleware);

router.get('/users', getAllUsers);
router.get('/users/:memberId', getUserByMemberId);
router.patch('/users/:memberId', updateUserByAdmin);
router.patch('/kyc/verify/:memberId', verifyKYC);

export default router;
