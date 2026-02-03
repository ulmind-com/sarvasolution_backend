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
    price: {
        type: Number,
        required: true,
        min: 0
    },
    mrp: {
        type: Number,
        required: true,
        min: 0
    },
    finalPrice: {
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
    sku: {
        type: String,
        unique: true,
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
    reorderLevel: {
        type: Number,
        default: 10
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

const Product = mongoose.model('Product', productSchema);
export default Product;
