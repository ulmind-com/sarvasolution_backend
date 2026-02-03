import express from 'express';
import {
    createFranchise,
    listFranchises,
    getFranchiseDetails,
    updateFranchise,
    updateFranchiseStatus,
    deleteFranchise
} from '../../controllers/admin/franchise.controller.js';
import authMiddleware from '../../middlewares/authMiddleware.js';
import adminMiddleware from '../../middlewares/adminMiddleware.js';
import { validateFranchiseCreation, validateFranchiseUpdate } from '../../middlewares/franchiseValidation.js';

const router = express.Router();

// Apply Admin Protection
router.use(authMiddleware, adminMiddleware);

// Routes
router.post('/create', validateFranchiseCreation, createFranchise);
router.get('/list', listFranchises);
router.get('/:franchiseId', getFranchiseDetails);
router.put('/update/:franchiseId', validateFranchiseUpdate, updateFranchise);
router.delete('/:franchiseId', deleteFranchise);

// Status Updates (Block/Unblock mapped to status update)
router.patch('/status/:franchiseId', updateFranchiseStatus);

// Legacy Adapters for Frontend compatibility if needed (mapping block/unblock to status)
router.patch('/block/:franchiseId', (req, res, next) => {
    req.body.status = 'blocked';
    updateFranchiseStatus(req, res, next);
});
router.patch('/unblock/:franchiseId', (req, res, next) => {
    req.body.status = 'active';
    updateFranchiseStatus(req, res, next);
});

export default router;
