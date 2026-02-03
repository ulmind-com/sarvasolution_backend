import mongoose from 'mongoose';

const franchiseInventorySchema = new mongoose.Schema({
    franchise: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Franchise',
        required: true,
        index: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    stockQuantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    purchasePrice: {
        type: Number,
        required: true
    },
    purchaseDate: {
        type: Date,
        default: Date.now
    },
    batchNo: {
        type: String,
        trim: true
    },
    expiryDate: {
        type: Date
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Composite index to ensure unique entry per product per franchise (unless batching requires splits)
// Ideally, if we track batches separately, we include batchNo. For now, assuming aggregated stock or row-per-batch.
// Given the requirements, let's keep it unique per product for simplicity unless batch tracking is strictly required at row level.
// "indexes: [{ franchise: 1, product: 1 }]" suggests unique constraint? 
// If a franchise buys same product twice with different prices/batches, we might want separate rows?
// But typically "Stock Quantity" aggregates. 
// I'll opt for unique compound index on franchise+product to simplify "current stock". 
// A separate collection or array field could track batches if needed. 
// For now, adhering to the simple schema:
franchiseInventorySchema.index({ franchise: 1, product: 1 }, { unique: true });

const FranchiseInventory = mongoose.model('FranchiseInventory', franchiseInventorySchema);
export default FranchiseInventory;
