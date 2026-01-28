import express from 'express';
import { register } from '../controllers/auth/register_user.controller.js';
import { login } from '../controllers/auth/login_user.controller.js';
import { getProfile } from '../controllers/user/profile.controller.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { uploadSingle } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.post('/register/user', uploadSingle, register);
router.post('/login/user', login);
router.get('/profile', authMiddleware, getProfile);

export default router;
