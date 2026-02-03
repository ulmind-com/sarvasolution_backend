import Invoice from '../../models/Invoice.model.js';
import FranchiseInventory from '../../models/FranchiseInventory.model.js';
import StockTransaction from '../../models/StockTransaction.model.js';
import Product from '../../models/Product.model.js';
import { generateInvoicePDF } from '../integration/pdf.service.js';
import { sendInvoiceEmail } from '../integration/email.service.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Process a Sales Transaction (Atomic)
 * Use this for both Direct Sales and Request Approvals
 * 
 * @param {Object} params
 * @param {Array} params.items - Array of { productId, quantity } (For approvals, these are Approved Quantities)
 * @param {Object} params.franchise - Populated Franchise Document
 * @param {Date} params.invoiceDate
 * @param {Object} params.session - Mongoose Session
 * @param {Object} params.user - Admin User triggering the sale
 * @returns {Object} { invoice, pdfUrl }
 */
export const processSaleTransaction = async ({
    items,
    franchise,
    invoiceDate,
    session,
    user
}) => {
    const processedItems = [];
    let subTotal = 0;

    for (const item of items) {
        const product = await Product.findById(item.productId).session(session);
        // Skip if product invalid/inactive? Or throw? Throwing ensures data integrity.
        if (!product || !product.isActive) {
            throw new ApiError(400, `Product not found or inactive: ${item.productId}`);
        }

        if (product.stockQuantity < item.quantity) {
            throw new ApiError(400, `Insufficient stock for ${product.productName}. Available: ${product.stockQuantity}`);
        }

        const itemAmount = item.quantity * product.price; // DP
        subTotal += itemAmount;

        processedItems.push({
            product: product._id,
            quantity: item.quantity,
            productDP: product.price,
            productMRP: product.mrp,
            amount: itemAmount,
            hsnCode: product.hsnCode,
            batchNo: product.batchNo,
            name: product.productName // For PDF
        });

        // 1. Deduct Main Inventory
        product.stockQuantity -= Number(item.quantity);
        await product.save({ session });

        // 2. Log Main Stock Transaction
        await StockTransaction.create([{
            product: product._id,
            transactionType: 'franchise_sale',
            quantity: Number(item.quantity),
            previousStock: product.stockQuantity + Number(item.quantity),
            newStock: product.stockQuantity,
            reason: `Sold to franchise ${franchise.vendorId}`,
            referenceNo: 'PENDING-INV',
            franchise: franchise._id,
            performedBy: user._id
        }], { session });

        // 3. Add to Franchise Inventory
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
                createdBy: user._id
            }], { session });
        }

        // Log Franchise Purchase
        await StockTransaction.create([{
            product: product._id,
            franchise: franchise._id,
            transactionType: 'franchise_purchase',
            quantity: Number(item.quantity),
            previousStock: existingStock ? existingStock.stockQuantity - Number(item.quantity) : 0,
            newStock: existingStock ? existingStock.stockQuantity : Number(item.quantity),
            reason: 'Stock received from Admin',
            performedBy: user._id
        }], { session });
    }

    // 4. Generate Invoice No
    const currentYear = new Date().getFullYear();
    const count = await Invoice.countDocuments().session(session);
    const invoiceNo = `INV-${currentYear}-${String(count + 1).padStart(5, '0')}`;

    // 5. Calculate GST
    const gstRate = 18;
    const gstAmount = (subTotal * gstRate) / 100;
    const grandTotal = subTotal + gstAmount;

    // 6. Create Invoice
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
        createdBy: user._id,
        status: 'sent'
    }], { session });

    return { invoice: invoice[0], processedItems, grandTotal, subTotal, gstAmount, gstRate };
};

/**
 * Handle Post-Transaction Logic (PDF, Email)
 * Call this AFTER committing the transaction
 */
export const handlePostSaleActions = async (invoice, processedItems, franchise) => {
    let pdfUrl = '';
    try {
        const invoiceDataForPdf = {
            invoiceNo: invoice.invoiceNo,
            invoiceDate: invoice.invoiceDate,
            items: processedItems,
            subTotal: invoice.subTotal,
            gstRate: invoice.gstRate,
            gstAmount: invoice.gstAmount,
            grandTotal: invoice.grandTotal,
            deliveryAddress: invoice.deliveryAddress
        };

        pdfUrl = await generateInvoicePDF(invoiceDataForPdf);

        // Update Invoice with PDF URL
        await Invoice.findByIdAndUpdate(invoice._id, { pdfUrl });

        // Send Email
        await sendInvoiceEmail({
            email: franchise.email,
            franchiseName: franchise.name,
            invoiceNo: invoice.invoiceNo,
            date: invoice.invoiceDate,
            grandTotal: invoice.grandTotal,
            pdfUrl
        });

        return pdfUrl;

    } catch (error) {
        console.error('Post-Sale Action Error (PDF/Email):', error);
        return null; // Don't crash flow if email fails
    }
};
