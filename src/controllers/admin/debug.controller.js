import Product from '../../models/Product.model.js';
import Franchise from '../../models/Franchise.model.js';
import User from '../../models/User.model.js';
import StockTransaction from '../../models/StockTransaction.model.js';
import Invoice from '../../models/Invoice.model.js';
import GSTCalculator from '../../services/gst.service.js';
import { generateVendorId } from '../../services/vendorId.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import bcrypt from 'bcryptjs';

export const getSystemStatus = asyncHandler(async (req, res) => {
    const stats = {
        products: await Product.countDocuments(),
        franchises: await Franchise.countDocuments(),
        users: await User.countDocuments(),
        invoices: await Invoice.countDocuments(),
        stockTransactions: await StockTransaction.countDocuments(),
        dbStatus: 'Connected'
    };
    return res.status(200).json(new ApiResponse(200, stats, "System Status"));
});

export const seedSystem = asyncHandler(async (req, res) => {
    // 1. Seed Products with GST
    const productsToSeed = [
        { name: "Premium Fish Feed", price: 1000, category: "aquaculture" },
        { name: "Organic Fertilizer", price: 500, category: "agriculture" },
        { name: "Vitamin Mix", price: 2000, category: "health care" },
        { name: "Herbal Soap", price: 50, category: "personal care" },
        { name: "Floor Cleaner", price: 150, category: "home care" }
    ];

    const createdProducts = [];
    for (const p of productsToSeed) {
        const gst = GSTCalculator.calculate(p.price, 18);
        const exists = await Product.findOne({ productName: p.name });
        if (!exists) {
            const product = await Product.create({
                productName: p.name,
                description: `High quality ${p.name}`,
                price: p.price,
                productDP: p.price * 0.9,
                mrp: gst.finalPriceIncGST * 1.2, // MRP slightly higher
                gstRate: 18,
                cgstRate: 9,
                sgstRate: 9,
                gstAmount: gst.gstAmount,
                finalPriceIncGST: gst.finalPriceIncGST,
                bv: p.price * 0.5,
                pv: p.price * 0.1,
                category: p.category,
                stockQuantity: 100,
                isActive: true,
                isApproved: true
            });
            createdProducts.push(product.productName);
        }
    }

    // 2. Seed Franchise
    const defaultPass = await bcrypt.hash("abc123", 10);
    const franchiseExists = await Franchise.findOne({ email: "test@franchise.com" });

    if (!franchiseExists) {
        await Franchise.create({
            vendorId: "FS000001",
            name: "Test Franchise",
            shopName: "Test Shop",
            email: "test@franchise.com",
            phone: "9999999999",
            password: defaultPass,
            city: "Kolkata",
            shopAddress: { street: "123 Test St", city: "Kolkata", state: "WB", pincode: "700001" },
            status: "active",
            role: "franchise",
            createdBy: req.user._id
        });
    }

    return res.status(200).json(new ApiResponse(200, {
        productsCreated: createdProducts,
        franchise: "test@franchise.com created/verified"
    }, "System Seeded Successfully"));
});
