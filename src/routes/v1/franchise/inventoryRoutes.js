import express from 'express';
import { getMyInventory } from '../../../controllers/franchise/inventory.controller.js';
import franchiseAuthMiddleware from '../../../middlewares/auth/franchiseAuthMiddleware.js';

const router = express.Router();

router.use(franchiseAuthMiddleware);

router.get('/list', getMyInventory);

export default router;
