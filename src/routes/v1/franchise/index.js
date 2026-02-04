import express from 'express';
import { loginFranchise } from '../../../controllers/franchise/auth.controller.js';
import inventoryRoutes from './inventoryRoutes.js';
import saleRoutes from './saleRoutes.js';
import requestRoutes from './requestRoutes.js';

const router = express.Router();

// Public Routes
router.post('/login', loginFranchise);

// Protected Routes
router.use('/inventory', inventoryRoutes);
router.use('/sale', saleRoutes);
router.use('/request', requestRoutes);

export default router;
