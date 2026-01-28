import express from 'express';
import { register } from '../controllers/auth/register_user.controller.js';
import { login } from '../controllers/auth/login_user.controller.js';

const router = express.Router();

router.post('/register/user', register);
router.post('/login/user', login);

export default router;
