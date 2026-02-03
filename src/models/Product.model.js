import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    description: {
        type: String,
        required: true
    },
    // PRICING
    price: { // Base Price (Distributor Price / Cost Price context? No, usually Admin Selling Price Base)
        type: Number,
        required: true,
        min: 0
    },
    productDP: { // Dealer Price (Price for Franchise)
        type: Number,
        required: true,
        default: function () { return this.price; } // Default to price if not set
    },
    mrp: { // Maximum Retail Price (Should match Final Price Inc GST)
        type: Number,
        required: true
    },

    // GST BREAKDOWN
    gstRate: {
        type: Number,
        required: true,
        enum: [0, 5, 12, 18, 28],
        default: 18
    },
    cgstRate: Number,
    sgstRate: Number,
    igstRate: Number,
    gstAmount: Number,
    finalPriceIncGST: Number, // Should be close to MRP

    // BUSINESS METRICS
    bv: {
        type: Number,
        required: true,
        default: 0
    },
    pv: {
        type: Number,
        required: true,
        default: 0
    },

    // INVENTORY
    hsnCode: {
        type: String,
        required: true,
        default: '000000'
    },
    batchNo: {
        type: String,
        trim: true,
        default: () => `BATCH-${Date.now()}` // Auto-generate if missing
    },
    sku: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['aquaculture', 'agriculture', 'personal care', 'health care', 'home care', 'luxury goods'],
        default: 'aquaculture'
    },
    stockQuantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    reorderLevel: {
        type: Number,
        default: 10
    },

    // MEDIA
    productImage: {
        url: { type: String, default: 'https://via.placeholder.com/400x400.png?text=No+Image' },
        publicId: { type: String, default: 'placeholder' }
    },

    // STATUS flags
    isInStock: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: true // Changed to TRUE by default to reduce friction
    },
    isApproved: {
        type: Boolean,
        default: true // Auto-approve admin products
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    isActivationPackage: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Text index for search
productSchema.index({ productName: 'text', description: 'text', category: 'text' });

const Product = mongoose.model('Product', productSchema);
export default Product;
