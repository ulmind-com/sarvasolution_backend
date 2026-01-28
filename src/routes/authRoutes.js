import express from 'express';
import { register } from '../controllers/auth/register_user.controller.js';

const router = express.Router();

router.post('/register/user', register);

export default router;
