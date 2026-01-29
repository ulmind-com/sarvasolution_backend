import mongoose from 'mongoose';

const bvTransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    transactionType: {
        type: String,
        required: true,
        enum: ['joining', 'repurchase', 'downline', 'admin-adjustment']
    },
    bvAmount: { type: Number, required: true },
    legAffected: {
        type: String,
        enum: ['left', 'right', 'personal', 'none'],
        default: 'none'
    },
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Source of downline BV
    description: String,
    referenceId: String // e.g., OrderId or RegistrationId
}, {
    timestamps: true
});

bvTransactionSchema.index({ userId: 1, createdAt: -1 });

const BVTransaction = mongoose.model('BVTransaction', bvTransactionSchema);
export default BVTransaction;
