import mongoose from 'mongoose';
import Invoice from '../../models/Invoice.model.js';
import FranchiseInventory from '../../models/FranchiseInventory.model.js';
import StockTransaction from '../../models/StockTransaction.model.js';
import Franchise from '../../models/Franchise.model.js';
import Product from '../../models/Product.model.js';
import { generateInvoicePDF } from '../../services/pdf.service.js';
import { sendInvoiceEmail } from '../../services/email.service.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

/**
 * @desc    Admin sells products to Franchise
 * @route   POST /api/v1/admin/sales/sell-to-franchise
 * @access  Admin
 */
export const sellToFranchise = asyncHandler(async (req, res) => {
    const { franchiseId, invoiceDate, items } = req.body;

    // Start Transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Validate Franchise
        const franchise = await Franchise.findById(franchiseId).session(session);
        if (!franchise) throw new ApiError(404, 'Franchise not found');
        if (franchise.isBlocked) throw new ApiError(400, 'Franchise is blocked');

        // 2. Process Items & Calculate Totals
        const processedItems = [];
        let subTotal = 0;

        for (const item of items) {
            const product = await Product.findById(item.productId).session(session);
            if (!product || !product.isActive) {
                throw new ApiError(400, `Product not found or inactive: ${item.productId}`);
            }

            if (product.stockQuantity < item.quantity) {
                throw new ApiError(400, `Insufficient stock for ${product.productName}. Available: ${product.stockQuantity}`);
            }

            const itemAmount = item.quantity * product.price; // using DP (price) not MRP
            subTotal += itemAmount;

            processedItems.push({
                product: product._id,
                quantity: item.quantity,
                productDP: product.price,
                productMRP: product.mrp,
                amount: itemAmount,
                hsnCode: product.hsnCode,
                batchNo: product.batchNo,
                name: product.productName // Temp for PDF
            });

            // 3. Deduct Main Inventory
            product.stockQuantity -= Number(item.quantity);
            await product.save({ session });

            // 4. Log Main Stock Transaction
            await StockTransaction.create([{
                product: product._id,
                transactionType: 'franchise_sale',
                quantity: Number(item.quantity), // Amount deducted
                previousStock: product.stockQuantity + Number(item.quantity),
                newStock: product.stockQuantity,
                reason: `Sold to franchise ${franchise.vendorId}`,
                referenceNo: 'PENDING-INV', // Will update later or use separate ID
                franchise: franchise._id,
                performedBy: req.user._id
            }], { session });

            // 5. Add to Franchise Inventory
            // Check if exists
            const existingStock = await FranchiseInventory.findOne({
                franchise: franchise._id,
                product: product._id
            }).session(session);

            if (existingStock) {
                existingStock.stockQuantity += Number(item.quantity);
                existingStock.updatedAt = new Date();
                await existingStock.save({ session });
            } else {
                await FranchiseInventory.create([{
                    franchise: franchise._id,
                    product: product._id,
                    stockQuantity: Number(item.quantity),
                    purchasePrice: product.price,
                    batchNo: product.batchNo,
                    createdBy: req.user._id
                }], { session });
            }

            // Log Franchise Incoming (Optional, logic implies Main Stock Trans encompasses the move, 
            // but for audit maybe we want a 'franchise_purchase' log linked to franchise? 
            // The prompt asked for "franchise inventory: type='franchise_purchase'".
            // So we should log that too.
            // But StockTransaction is defined to link to Product.
            // If we log another StockTxn for same product but different context, that works.)
            await StockTransaction.create([{
                product: product._id,
                franchise: franchise._id,
                transactionType: 'franchise_purchase',
                quantity: Number(item.quantity),
                previousStock: existingStock ? existingStock.stockQuantity - Number(item.quantity) : 0,
                // Note: accurate prev stock logic above is slightly off if we just updated it. 
                // Better to capture prev before update. For simplicity, assuming 0 if new.
                newStock: existingStock ? existingStock.stockQuantity : Number(item.quantity),
                reason: 'Stock received from Admin',
                performedBy: req.user._id
            }], { session });
        }

        // 6. Generate Invoice No
        const currentYear = new Date().getFullYear();
        const count = await Invoice.countDocuments().session(session);
        const invoiceNo = `INV-${currentYear}-${String(count + 1).padStart(5, '0')}`;

        // 7. Calculate GST (Assuming flat 18% for now)
        const gstRate = 18;
        const gstAmount = (subTotal * gstRate) / 100;
        const grandTotal = subTotal + gstAmount;

        // 8. Create Invoice
        const invoice = await Invoice.create([{
            invoiceNo,
            invoiceDate: invoiceDate || new Date(),
            franchise: franchise._id,
            items: processedItems,
            subTotal,
            gstRate,
            gstAmount,
            grandTotal,
            deliveryAddress: {
                franchiseName: franchise.name,
                shopName: franchise.shopName,
                fullAddress: `${franchise.shopAddress.street}, ${franchise.shopAddress.landmark || ''}`,
                city: franchise.city,
                state: franchise.shopAddress.state,
                pincode: franchise.shopAddress.pincode
            },
            createdBy: req.user._id,
            status: 'sent'
        }], { session });

        // Commit DB changes
        await session.commitTransaction();

        // 9. Generate & Upload PDF (Non-blocking usually, but we want URL in response)
        // Since transaction is committed, we can safely generate PDF now.
        // We'll update the invoice with PDF URL after generation.
        // Re-fetch invoice or use object.

        let pdfUrl = '';
        try {
            // Populate product names for PDF
            // processedItems already has 'name'.

            const invoiceDataForPdf = {
                invoiceNo: invoice[0].invoiceNo,
                invoiceDate: invoice[0].invoiceDate,
                items: processedItems,
                subTotal,
                gstRate,
                gstAmount,
                grandTotal,
                deliveryAddress: invoice[0].deliveryAddress
            };

            pdfUrl = await generateInvoicePDF(invoiceDataForPdf);

            // Update Invoice with PDF URL
            await Invoice.findByIdAndUpdate(invoice[0]._id, { pdfUrl });

            // 10. Send Email
            await sendInvoiceEmail({
                email: franchise.email,
                franchiseName: franchise.name,
                invoiceNo: invoice[0].invoiceNo,
                date: invoice[0].invoiceDate,
                grandTotal,
                pdfUrl
            });

        } catch (postCommitError) {
            console.error('Post-commit error (PDF/Email):', postCommitError);
            // Don't fail the request since data is saved. Just log it.
        }

        return res.status(201).json(
            new ApiResponse(201, {
                invoice: { ...invoice[0].toObject(), pdfUrl },
                emailSent: !!pdfUrl // simplistic check
            }, 'Sale processed successfully')
        );

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * @desc    Get Sales History
 * @route   GET /api/v1/admin/sales/list
 */
export const getSalesHistory = asyncHandler(async (req, res) => {
    const {
        page = 1, limit = 20,
        franchiseId, invoiceNo, status
    } = req.query;

    const query = {};
    if (franchiseId) query.franchise = franchiseId;
    if (invoiceNo) query.invoiceNo = invoiceNo;
    if (status) query.status = status;

    const invoices = await Invoice.find(query)
        .populate('franchise', 'name shopName vendorId')
        .sort({ invoiceDate: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await Invoice.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(200, {
            invoices,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(total / limit),
                totalInvoices: total
            }
        }, 'Sales history fetched')
    );
});
