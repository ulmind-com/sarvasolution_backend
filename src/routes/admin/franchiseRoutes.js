import express from 'express';
import {
    createFranchise,
    listFranchises,
    updateFranchise,
    blockFranchise,
    unblockFranchise
} from '../../controllers/admin/franchise.controller.js';
import authMiddleware from '../../middlewares/authMiddleware.js';
import adminMiddleware from '../../middlewares/adminMiddleware.js';
import { validateFranchiseCreation } from '../../middlewares/franchiseValidation.js';

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.post('/create', validateFranchiseCreation, createFranchise);
router.get('/list', listFranchises);
router.put('/:franchiseId', updateFranchise);
router.patch('/:franchiseId/block', blockFranchise);
router.patch('/:franchiseId/unblock', unblockFranchise);

export default router;
