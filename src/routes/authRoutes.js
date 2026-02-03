import express from 'express';
import { register } from '../controllers/auth/register_user.controller.js';
import { login } from '../controllers/auth/login_user.controller.js';
import { getProfile } from '../controllers/user/profile.controller.js';
import { updateProfile } from '../controllers/user/update_profile.controller.js';
import { submitKYC } from '../controllers/user/kyc.controller.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { uploadSingle, uploadKYC } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.post('/register/user', register);
router.post('/login/user', login);
router.post('/admin/login', login); // Shared login logic for now
router.get('/profile', authMiddleware, getProfile);
router.patch('/profile', authMiddleware, uploadSingle, updateProfile);
router.post('/kyc/submit', authMiddleware, uploadKYC, submitKYC);

export default router;
