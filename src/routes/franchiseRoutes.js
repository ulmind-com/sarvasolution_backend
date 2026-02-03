import express from 'express';
import { loginFranchise } from '../controllers/franchise/auth.controller.js';

const router = express.Router();

// Public Routes
router.post('/login', loginFranchise);

// Protected Routes (Future use with franchiseAuthMiddleware)
// router.get('/profile', franchiseAuth, getProfile);

export default router;
