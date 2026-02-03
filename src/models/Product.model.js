import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    // Basic Information
    productName: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        minlength: [3, 'Product name must be at least 3 characters'],
        maxlength: [100, 'Product name cannot exceed 100 characters'],
        unique: true,
        index: true
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        minlength: [20, 'Description must be at least 20 characters'],
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price must be a positive number']
    },
    mrp: {
        type: Number,
        required: [true, 'MRP is required'],
        min: [0, 'MRP must be a positive number'],
        validate: {
            validator: function (v) {
                return v >= this.price;
            },
            message: 'MRP must be greater than or equal to the selling price'
        }
    },

    // MLM Business Volume
    bv: {
        type: Number,
        required: [true, 'Business Volume (BV) is required'],
        min: [0, 'BV must be a positive number'],
        default: 0
    },
    pv: {
        type: Number,
        required: [true, 'Point Value (PV) is required'],
        min: [0, 'PV must be a positive number'],
        default: 0
    },

    // Product Identification
    hsnCode: {
        type: String,
        required: [true, 'HSN Code is required'],
        trim: true,
        validate: {
            validator: function (v) {
                return /^[0-9]{6,8}$/.test(v);
            },
            message: 'HSN code must be 6 to 8 digits'
        }
    },
    batchNo: {
        type: String,
        required: [true, 'Batch number is required'],
        trim: true,
        index: true
    },
    sku: {
        type: String,
        unique: true,
        index: true
    },

    // Categorization
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: {
            values: [
                'aquaculture',
                'agriculture',
                'personal care',
                'health care',
                'home care',
                'luxury goods'
            ],
            message: 'Invalid category'
        },
        index: true
    },

    // Media & Assets
    productImage: {
        url: {
            type: String,
            required: [true, 'Product image URL is required']
        },
        publicId: {
            type: String,
            required: [true, 'Image Public ID is required']
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    },

    // Inventory Management
    stockQuantity: {
        type: Number,
        required: [true, 'Stock quantity is required'],
        min: [0, 'Stock cannot be negative'],
        default: 0
    },
    reorderLevel: {
        type: Number,
        default: 10,
        min: 0
    },

    // Product Status
    isActive: {
        type: Boolean,
        default: false,
        index: true
    },
    isApproved: {
        type: Boolean,
        default: false,
        index: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    isActivationPackage: {
        type: Boolean,
        default: false
    },

    // Pricing & Discounts
    discount: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    finalPrice: {
        type: Number,
        default: 0
    },

    // Audit Fields
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for Stock Status
productSchema.virtual('isInStock').get(function () {
    return this.stockQuantity > 0;
});

// Pre-save hook to calculate final price and ensure logic
productSchema.pre('save', async function (next) {
    // 1. Calculate discount/final price
    if (this.isModified('price') || this.isModified('discount')) {
        const discountAmount = (this.price * this.discount) / 100;
        this.finalPrice = Math.round(this.price - discountAmount);
    }

    // 2. Auto-generate SKU if not present (Simple format: SSVPL-CAT-RANDOM)
    // Note: In production, you might want a more sequential robust counter
    if (!this.sku) {
        const categoryCode = this.category.substring(0, 3).toUpperCase();
        const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
        this.sku = `SSVPL-${categoryCode}-${randomStr}`;
    }

    next();
});

// Index for Text Search
productSchema.index({ productName: 'text', hsnCode: 'text', sku: 'text' });
productSchema.index({ createdAt: -1 });

const Product = mongoose.model('Product', productSchema);
export default Product;
