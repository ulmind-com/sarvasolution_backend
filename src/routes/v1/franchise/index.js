import express from 'express';
import { loginFranchise } from '../../../controllers/franchise/auth.controller.js';
import inventoryRoutes from './inventoryRoutes.js';
import saleRoutes from './saleRoutes.js';

const router = express.Router();

// Public Routes
router.post('/login', loginFranchise);

// Protected Routes
router.use('/inventory', inventoryRoutes);
router.use('/sale', saleRoutes);

export default router;
