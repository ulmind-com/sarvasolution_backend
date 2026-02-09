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
import { uploadPDFToCloudinary } from '../../services/integration/cloudinary.service.js';

/**
 * Get User by MemberId
 * @route GET /api/v1/franchise/sale/user/:memberId
 */
export const getUserByMemberId = asyncHandler(async (req, res) => {
    const { memberId } = req.params;

    const user = await User.findOne({ memberId })
        .select('memberId fullName email phone status personalPV totalPV isActive isFirstPurchaseDone');

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

    // Check if this is first purchase (using explicit flag)
    const isFirstPurchase = !user.isFirstPurchaseDone;

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

            // Calculate values based on purchase type
            // FIRST PURCHASE: Only PV, BV = 0
            // REPURCHASE: Only BV, PV = 0
            let itemPV = 0;
            let itemBV = 0;

            if (isFirstPurchase) {
                // First purchase: Only calculate PV
                itemPV = product.pv * item.quantity;
                itemBV = 0;
            } else {
                // Repurchase: Only calculate BV
                itemPV = 0;
                itemBV = product.bv * item.quantity;
            }

            const amount = product.price * item.quantity;

            totalPV += itemPV;
            totalBV += itemBV;
            subTotal += amount;

            // Deduct from franchise inventory
            franchiseStock.stockQuantity -= item.quantity;
            await franchiseStock.save({ session });

            processedItems.push({
                product: product._id,
                productId: product.productId,
                quantity: item.quantity,
                price: product.price,
                productDP: product.productDP,
                pv: product.pv,  // Keep product PV for reference
                bv: product.bv,  // Keep product BV for reference
                totalPV: itemPV, // Will be 0 for repurchase
                totalBV: itemBV, // Will be 0 for first purchase
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

        // 6. Validate Purchase Type and Determine Activation
        // At this point, totalPV and totalBV are already correctly calculated based on isFirstPurchase
        let willActivate = false;

        if (isFirstPurchase) {
            // FIRST PURCHASE: Must have >= 1 PV to activate account
            // totalBV is already 0 from item processing
            if (totalPV < 1) {
                throw new ApiError(400, 'First purchase must have at least 1 PV to activate the account and generate the bill.');
            }
            willActivate = (user.status === 'inactive');
        } else {
            // REPURCHASE: Only BV matters
            // totalPV is already 0 from item processing
            // No minimum BV requirement for repurchase
        }

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
            totalPV, // Will be 0 for repurchase
            totalBV,
            isFirstPurchase,
            userActivated: willActivate,
            paymentMethod,
            createdBy: req.franchise._id
        }], { session });

        // 8. Update user PV/BV based on purchase type
        if (isFirstPurchase) {
            // FIRST PURCHASE: Only add PV, no BV
            user.personalPV += totalPV;
            user.totalPV += totalPV;
            user.thisMonthPV += totalPV;
            user.thisYearPV += totalPV;

            // Mark first purchase as done
            user.isFirstPurchaseDone = true;
        } else {
            // REPURCHASE: Only add BV, no PV
            user.personalBV += totalBV;
            user.totalBV += totalBV;
            user.thisMonthBV += totalBV;
            user.thisYearBV += totalBV;
        }

        // 9. ACTIVATION LOGIC - First purchase with PV >= 1
        let activationMessage = '';
        if (willActivate) {
            user.status = 'active';
            activationMessage = ' - User account activated!';

            // TODO: Trigger upline PV/BV updates
            // TODO: Trigger commission calculations
        }

        // Save User Updates (Activation, PV/BV, FirstPurchaseFlag)
        await user.save({ session });

        // 11. Post-transaction: Generate PDF and send email
        let emailSent = false;
        let pdfCloudinaryUrl = null;
        let pdfPublicId = null;

        try {
            // Get franchise details for PDF (Sender)
            const franchise = await Franchise.findById(req.franchise._id);

            // Determine Tax Type (IGST or CGST+SGST)
            // Logic: If Franchise State differs from User State -> IGST, else CGST+SGST
            // Defaulting to West Bengal for Franchise if missing (common logic, or use 'N/A')
            const franchiseState = franchise.shopAddress?.state || 'West Bengal';
            const userState = user.address?.state || 'West Bengal';
            const isInterState = franchiseState.toLowerCase() !== userState.toLowerCase();

            // Populate product details for PDF with calculated fields
            const populatedItems = await Promise.all(
                processedItems.map(async (item) => {
                    const product = await Product.findById(item.product);

                    // Tax Calculation per item
                    // Assuming product.price is taxable value? 
                    // No, usually Price in DB is base price. 
                    // Let's assume item.amount (qty * price) is the Taxable Value.
                    const taxableValue = item.amount;

                    // Calculate Tax amounts per item for the table
                    const gstPercent = 18; // Standard or from product? Using 18 as per previous code
                    // Ideally: const gstPercent = (product.gst + product.cgst + product.sgst) || 18;

                    let cgstRate = 0, sgstRate = 0, igstRate = 0;
                    let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;

                    if (isInterState) {
                        igstRate = gstPercent;
                        igstAmount = (taxableValue * igstRate) / 100;
                    } else {
                        cgstRate = gstPercent / 2;
                        sgstRate = gstPercent / 2;
                        cgstAmount = (taxableValue * cgstRate) / 100;
                        sgstAmount = (taxableValue * sgstRate) / 100;
                    }

                    return {
                        ...item,
                        productName: product.productName,
                        hsnCode: product.hsnCode,
                        batchNo: product.batchNo,
                        mrp: product.mrp,
                        rate: product.price, // Base rate
                        taxableValue: taxableValue,
                        cgstRate, cgstAmount,
                        sgstRate, sgstAmount,
                        igstRate, igstAmount
                    };
                })
            );

            // Generate PDF
            const pdfBuffer = await generateInvoicePDFBuffer({
                details: {
                    invoiceNo: saleNo,
                    invoiceDate: new Date(),
                    reverseCharge: 'No', // Hardcoded for now
                    transportMode: 'N/A',
                    vehicleNo: 'N/A'
                },
                sender: {
                    name: franchise.name,
                    shopName: franchise.shopName,
                    address: franchise.shopAddress?.street || '',
                    city: franchise.city,
                    state: franchise.shopAddress?.state || '',
                    pincode: franchise.shopAddress?.pincode || '',
                    phone: franchise.phone,
                    gstin: '19ABRCS5991B1ZQ' // Updated GST number
                },
                receiver: {
                    name: user.fullName,
                    fullAddress: user.address?.street || 'N/A',
                    city: user.address?.city || 'N/A',
                    state: user.address?.state || 'N/A',
                    pincode: user.address?.zipCode || 'N/A',
                    phone: user.phone,
                    gstin: 'N/A' // User GST usually N/A for B2C
                },
                items: populatedItems,
                isFirstPurchase, // Pass purchase type flag for conditional display
                totals: {
                    totalPV,
                    totalBV, // Include totalBV for repurchase display
                    subTotal, // Taxable Value Total
                    gstRate,
                    totalCGST: isInterState ? 0 : gstAmount / 2,
                    totalSGST: isInterState ? 0 : gstAmount / 2,
                    totalIGST: isInterState ? gstAmount : 0,
                    grandTotal,
                    amountInWords: 'Rupees ...' // Can add a util for number to words later
                }
            });

            // Upload PDF to Cloudinary
            try {
                const pdfUploadResult = await uploadPDFToCloudinary(
                    pdfBuffer,
                    'sarvasolution/invoices',
                    `invoice_${saleNo}`
                );
                pdfCloudinaryUrl = pdfUploadResult.url;
                pdfPublicId = pdfUploadResult.publicId;

                // Update the sale record with PDF URL
                await FranchiseSale.findByIdAndUpdate(sale[0]._id, {
                    pdfUrl: pdfCloudinaryUrl,
                    pdfPublicId: pdfPublicId
                });

                console.log(`[PDF] Uploaded to Cloudinary: ${pdfCloudinaryUrl}`);
            } catch (pdfUploadError) {
                console.error('Error uploading PDF to Cloudinary:', pdfUploadError);
                // Don't fail the sale if PDF upload fails
            }

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

        // Commit the transaction
        await session.commitTransaction();

        return res.status(201).json(
            new ApiResponse(201, {
                sale: sale[0],
                userActivated: willActivate,
                isFirstPurchase,
                totalPV,
                totalBV,
                grandTotal,
                emailSent,
                pdfUrl: pdfCloudinaryUrl
            }, `Sale completed successfully${activationMessage}${emailSent ? ' - Invoice sent to user email' : ''}`)
        );

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Get Sales History for Franchise
 * @route GET /api/v1/franchise/sale/history
 */
export const getSalesHistory = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        sortBy = 'saleDate',
        sortOrder = 'desc'
    } = req.query;

    // Build query for franchise's sales only (no filters)
    const query = {
        franchise: req.franchise._id,
        deletedAt: null
    };

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query with population
    const sales = await FranchiseSale.find(query)
        .populate({
            path: 'user',
            select: 'memberId fullName email phone address status isFirstPurchaseDone personalPV totalPV personalBV totalBV'
        })
        .populate({
            path: 'items.product',
            select: 'productName productId hsnCode category'
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    // Get total count for pagination
    const totalCount = await FranchiseSale.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(200, {
            sales,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / parseInt(limit)),
                totalCount,
                limit: parseInt(limit),
                hasNextPage: parseInt(page) < Math.ceil(totalCount / parseInt(limit)),
                hasPrevPage: parseInt(page) > 1
            }
        }, 'Sales history fetched successfully')
    );
});
