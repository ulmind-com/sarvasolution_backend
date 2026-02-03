import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    description: {
        type: String,
        required: true
    },
    price: { // Base Selling Price (Excluding Taxes)
        type: Number,
        required: true,
        min: 0
    },
    mrp: { // Maximum Retail Price (Inclusive of all taxes)
        type: Number,
        required: true,
        min: 0
    },

    // Tax Components (Percentages)
    gst: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },

    finalPrice: { // Auto-calculated: Price + Taxes
        type: Number
    },

    discount: {
        type: Number,
        default: 0
    },
    bv: { // Business Volume
        type: Number,
        default: 0
    },
    pv: { // Point Value
        type: Number,
        default: 0
    },
    hsnCode: {
        type: String,
        trim: true
    },
    batchNo: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['aquaculture', 'agriculture', 'personal care', 'health care', 'home care', 'luxury goods'],
        index: true
    },
    productImage: {
        url: { type: String, required: true },
        publicId: { type: String, required: true }
    },
    stockQuantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    isInStock: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isApproved: {
        type: Boolean,
        default: true // Admin created -> approved
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    isActivationPackage: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

productSchema.index({ productName: 'text', description: 'text' });

// Pre-save hook to calculate Final Price
productSchema.pre('save', function (next) {
    // Calculate total tax percentage
    const totalTaxPercent = (this.gst || 0) + (this.cgst || 0) + (this.sgst || 0);

    // Calculate Tax Amount
    const taxAmount = this.price * (totalTaxPercent / 100);

    // Final Price = Base Price + Tax
    this.finalPrice = this.price + taxAmount;

    next();
});

const Product = mongoose.model('Product', productSchema);
export default Product;
