import mongoose from 'mongoose';

const franchiseSaleItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productId: {
        type: String,
        trim: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true
    },
    productDP: {
        type: Number,
        required: true
    },
    pv: {
        type: Number,
        default: 0
    },
    bv: {
        type: Number,
        default: 0
    },
    totalPV: {
        type: Number,
        default: 0
    },
    totalBV: {
        type: Number,
        default: 0
    },
    amount: {
        type: Number,
        required: true
    },
    hsnCode: String
});

const franchiseSaleSchema = new mongoose.Schema({
    saleNo: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    saleDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    franchise: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Franchise',
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    memberId: {
        type: String,
        required: true,
        trim: true,
        index: true
    },

    items: [franchiseSaleItemSchema],

    // Financials
    subTotal: {
        type: Number,
        required: true
    },
    gstRate: {
        type: Number,
        default: 18
    },
    gstAmount: {
        type: Number,
        required: true
    },
    grandTotal: {
        type: Number,
        required: true
    },

    // MLM Values
    totalPV: {
        type: Number,
        default: 0
    },
    totalBV: {
        type: Number,
        default: 0
    },

    // First Purchase & Activation
    isFirstPurchase: {
        type: Boolean,
        default: false
    },
    userActivated: {
        type: Boolean,
        default: false
    },

    // Payment
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'paid'
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'upi', 'bank_transfer'],
        default: 'cash'
    },

    // PDF Invoice
    pdfUrl: {
        type: String
    },
    pdfPublicId: {
        type: String
    },

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Franchise'
    },
    notes: String,
    deletedAt: {
        type: Date,
        default: null
    }

}, {
    timestamps: true
});

// Indexes
franchiseSaleSchema.index({ franchise: 1, saleDate: -1 });
franchiseSaleSchema.index({ user: 1, saleDate: -1 });

const FranchiseSale = mongoose.model('FranchiseSale', franchiseSaleSchema);
export default FranchiseSale;
