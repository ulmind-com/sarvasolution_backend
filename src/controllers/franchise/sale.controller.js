import mongoose from 'mongoose';
import FranchiseSale from '../../models/FranchiseSale.model.js';
import FranchiseInventory from '../../models/FranchiseInventory.model.js';
import Product from '../../models/Product.model.js';
import User from '../../models/User.model.js';
import Franchise from '../../models/Franchise.model.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { generateInvoicePDFBuffer } from '../../services/integration/pdf.service.js';
import { sendInvoiceEmailWithAttachment } from '../../services/integration/email.service.js';

/**
 * Get User by MemberId
 * @route GET /api/v1/franchise/sale/user/:memberId
 */
export const getUserByMemberId = asyncHandler(async (req, res) => {
    const { memberId } = req.params;

    const user = await User.findOne({ memberId })
        .select('memberId fullName email phone status personalPV totalPV isActive');

    if (!user) {
        throw new ApiError(404, 'User not found with this Member ID');
    }

    return res.status(200).json(
        new ApiResponse(200, user, 'User details fetched successfully')
    );
});

/**
 * Sell Products to User
 * @route POST /api/v1/franchise/sale/sell
 */
export const sellToUser = asyncHandler(async (req, res) => {
    const { memberId, items, paymentMethod = 'cash' } = req.body;

    // 1. Validate and get user
    const user = await User.findOne({ memberId });
    if (!user) {
        throw new ApiError(404, 'User not found with this Member ID');
    }

    // Check if this is first purchase
    const isFirstPurchase = user.personalPV === 0 && user.totalPV === 0;

    // 2. Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        let subTotal = 0;
        let totalPV = 0;
        let totalBV = 0;
        const processedItems = [];

        // 3. Process each item
        for (const item of items) {
            const product = await Product.findById(item.productId).session(session);
            if (!product) {
                throw new ApiError(404, `Product not found: ${item.productId}`);
            }

            // Check franchise inventory
            const franchiseStock = await FranchiseInventory.findOne({
                franchise: req.franchise._id,
                product: product._id
            }).session(session);

            if (!franchiseStock || franchiseStock.stockQuantity < item.quantity) {
                throw new ApiError(400, `Insufficient stock for ${product.productName}. Available: ${franchiseStock?.stockQuantity || 0}`);
            }

            // Calculate values
            const itemPV = product.pv * item.quantity;
            const itemBV = product.bv * item.quantity;
            const amount = product.price * item.quantity;

            totalPV += itemPV;
            totalBV += itemBV;
            subTotal += amount;

            // Deduct from franchise inventory
            franchiseStock.stockQuantity -= item.quantity;
            await franchiseStock.save({ session });

            processedItems.push({
                product: product._id,
                quantity: item.quantity,
                price: product.price,
                productDP: product.productDP,
                pv: product.pv,
                bv: product.bv,
                totalPV: itemPV,
                totalBV: itemBV,
                amount,
                hsnCode: product.hsnCode
            });
        }

        // 4. Calculate GST
        const gstRate = 18;
        const gstAmount = (subTotal * gstRate) / 100;
        const grandTotal = subTotal + gstAmount;

        // 5. Generate sale number
        const currentYear = new Date().getFullYear();
        const count = await FranchiseSale.countDocuments().session(session);
        const saleNo = `FS-${currentYear}-${String(count + 1).padStart(5, '0')}`;

        // 6. Determine if user will be activated
        const willActivate = isFirstPurchase && totalPV >= 1 && user.status === 'inactive';

        // 7. Create sale record
        const sale = await FranchiseSale.create([{
            saleNo,
            saleDate: new Date(),
            franchise: req.franchise._id,
            user: user._id,
            memberId: user.memberId,
            items: processedItems,
            subTotal,
            gstRate,
            gstAmount,
            grandTotal,
            totalPV,
            totalBV,
            isFirstPurchase,
            userActivated: willActivate,
            paymentMethod,
            createdBy: req.franchise._id
        }], { session });

        // 8. Update user PV/BV
        user.personalPV += totalPV;
        user.personalBV += totalBV;
        user.totalPV += totalPV;
        user.totalBV += totalBV;
        user.thisMonthPV += totalPV;
        user.thisMonthBV += totalBV;
        user.thisYearPV += totalPV;
        user.thisYearBV += totalBV;

        // 9. ACTIVATION LOGIC - First purchase with PV >= 1
        let activationMessage = '';
        if (willActivate) {
            user.status = 'active';
            activationMessage = ' - User account activated!';

            // TODO: Trigger upline PV/BV updates
            // TODO: Trigger commission calculations
        }

        await user.save({ session });

        // 10. Commit transaction
        await session.commitTransaction();

        // 11. Post-transaction: Generate PDF and send email
        let emailSent = false;
        try {
            // Get franchise details for PDF
            const franchise = await Franchise.findById(req.franchise._id);

            // Populate product details for PDF
            const populatedItems = await Promise.all(
                processedItems.map(async (item) => {
                    const product = await Product.findById(item.product);
                    return {
                        ...item,
                        product: {
                            productName: product.productName,
                            hsnCode: product.hsnCode
                        }
                    };
                })
            );

            // Generate PDF
            const pdfBuffer = await generateInvoicePDFBuffer({
                invoiceNo: saleNo,
                invoiceDate: new Date(),
                items: populatedItems,
                subTotal,
                gstRate,
                gstAmount,
                grandTotal,
                deliveryAddress: {
                    franchiseName: user.fullName,
                    shopName: franchise?.shopName || 'SSVPL Member',
                    fullAddress: user.address?.street || 'Address not provided',
                    city: user.address?.city || '',
                    state: user.address?.state || '',
                    pincode: user.address?.zipCode || ''
                }
            });

            // Send email with PDF attachment
            emailSent = await sendInvoiceEmailWithAttachment({
                email: user.email,
                franchiseName: user.fullName,
                invoiceNo: saleNo,
                date: new Date(),
                grandTotal,
                pdfBuffer,
                pdfFilename: `${saleNo}.pdf`
            });

        } catch (emailError) {
            console.error('Error sending invoice email:', emailError);
            // Don't fail the sale if email fails
        }

        return res.status(201).json(
            new ApiResponse(201, {
                sale: sale[0],
                userActivated: willActivate,
                isFirstPurchase,
                totalPV,
                totalBV,
                grandTotal,
                emailSent
            }, `Sale completed successfully${activationMessage}${emailSent ? ' - Invoice sent to user email' : ''}`)
        );

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});
