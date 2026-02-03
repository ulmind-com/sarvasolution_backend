import express from 'express';
import { loginFranchise } from '../../../controllers/franchise/auth.controller.js';
import inventoryRoutes from './inventoryRoutes.js';

const router = express.Router();

// Public Routes
router.post('/login', loginFranchise);

// Protected Routes
router.use('/inventory', inventoryRoutes);

export default router;
