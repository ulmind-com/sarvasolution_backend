import mongoose from 'mongoose';
import moment from 'moment-timezone';

const invoiceItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    productDP: {
        type: Number,
        required: true
    },
    productMRP: {
        type: Number,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    hsnCode: String,
    batchNo: String
});

const invoiceSchema = new mongoose.Schema({
    invoiceNo: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    invoiceDate: {
        type: Date,
        default: Date.now,
        required: true,
        index: true
    },
    franchise: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Franchise',
        required: true,
        index: true
    },
    items: [invoiceItemSchema],

    // Financials
    subTotal: {
        type: Number,
        required: true
    },
    gstRate: {
        type: Number,
        required: true,
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

    // Payment
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'overdue'],
        default: 'pending',
        index: true
    },
    paymentDueDate: {
        type: Date
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    paymentDate: {
        type: Date
    },
    paymentMethod: {
        type: String
    },

    // Delivery Info
    deliveryAddress: {
        franchiseName: String,
        shopName: String,
        fullAddress: String,
        city: String,
        pincode: String,
        state: String
    },

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['draft', 'sent', 'paid', 'cancelled'],
        default: 'draft',
        index: true
    },
    pdfUrl: String,
    emailSent: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },

    // Timezone Fields
    createdAt_IST: { type: String, default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss') },
    updatedAt_IST: { type: String, default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss') }

}, {
    timestamps: true
});

invoiceSchema.pre('save', function (next) {
    this.updatedAt_IST = moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss');
    next();
});

// Indexes
invoiceSchema.index({ franchise: 1, invoiceDate: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
