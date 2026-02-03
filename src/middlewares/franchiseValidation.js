import { body, validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';
import Franchise from '../models/Franchise.model.js';

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessage = errors.array().map(err => err.msg).join(', ');
        throw new ApiError(400, errorMessage);
    }
    next();
};

export const validateFranchiseCreation = [
    body('name')
        .trim().isLength({ min: 3, max: 100 }).withMessage('Name must be 3-100 chars')
        .matches(/^[a-zA-Z\s]+$/).withMessage('Name must contain only letters'),

    body('shopName')
        .trim().isLength({ min: 3, max: 150 }).withMessage('Shop name must be 3-150 chars'),

    body('email')
        .isEmail().withMessage('Invalid email address')
        .custom(async (value) => {
            const exists = await Franchise.findOne({ email: value });
            if (exists) throw new Error('Email already registered');
        }),

    body('phone')
        .matches(/^[6-9]\d{9}$/).withMessage('Invalid Indian mobile number')
        .custom(async (value) => {
            const exists = await Franchise.findOne({ phone: value });
            if (exists) throw new Error('Phone number already in use');
        }),

    body('password')
        .isLength({ min: 8 }).withMessage('Password min 8 chars')
        .matches(/[A-Z]/).withMessage('Must contain uppercase')
        .matches(/[a-z]/).withMessage('Must contain lowercase')
        .matches(/[0-9]/).withMessage('Must contain number')
        .matches(/[!@#$%^&*]/).withMessage('Must contain special char'),

    body('city').trim().notEmpty().withMessage('City is required'),

    body('shopAddress.street').notEmpty().withMessage('Street address required'),
    body('shopAddress.pincode').matches(/^\d{6}$/).withMessage('Invalid 6-digit Pincode'),
    body('shopAddress.state').notEmpty().withMessage('State is required'),

    handleValidationErrors
];

export const validateFranchiseUpdate = [
    body('name').optional().trim().isLength({ min: 3 }).matches(/^[a-zA-Z\s]+$/),
    body('shopName').optional().trim().isLength({ min: 3 }),
    body('email').optional().isEmail(),
    body('phone').optional().matches(/^[6-9]\d{9}$/),
    body('city').optional().trim().notEmpty(),

    handleValidationErrors
];
