import express from 'express';
import {
    createFranchise,
    listFranchises,
    getFranchiseDetails,
    updateFranchise,
    blockFranchise,
    unblockFranchise,
    deleteFranchise
} from '../../controllers/admin/franchise.controller.js';
import authMiddleware from '../../middlewares/authMiddleware.js';
import adminMiddleware from '../../middlewares/adminMiddleware.js';
import { validateFranchiseCreation, validateFranchiseUpdate } from '../../middlewares/franchiseValidation.js';

const router = express.Router();

// Apply Admin Protection
router.use(authMiddleware, adminMiddleware);

router.post('/create', validateFranchiseCreation, createFranchise);
router.get('/list', listFranchises);
router.get('/:franchiseId', getFranchiseDetails);
router.put('/update/:franchiseId', validateFranchiseUpdate, updateFranchise);
router.patch('/block/:franchiseId', blockFranchise);
router.patch('/unblock/:franchiseId', unblockFranchise);
router.delete('/:franchiseId', deleteFranchise);

export default router;
