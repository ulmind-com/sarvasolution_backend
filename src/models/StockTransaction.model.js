import mongoose from 'mongoose';

const stockTransactionSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    transactionType: {
        type: String,
        enum: ['add', 'remove', 'order', 'return', 'adjustment'],
        required: true,
        index: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be positive']
    },
    previousStock: {
        type: Number,
        required: true
    },
    newStock: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true,
        trim: true
    },
    referenceNo: {
        type: String,
        trim: true
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    metadata: {
        type: Map,
        of: String
    }
}, {
    timestamps: { createdAt: true, updatedAt: false } // Immutable logs
});

// Index for getting history of a product efficiently
stockTransactionSchema.index({ product: 1, createdAt: -1 });

const StockTransaction = mongoose.model('StockTransaction', stockTransactionSchema);
export default StockTransaction;
