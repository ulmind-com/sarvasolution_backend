import mongoose from 'mongoose';

const payoutSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    memberId: { type: String, required: true },
    payoutType: {
        type: String,
        required: true,
        enum: [
            'fast-track',
            'star-matching',
            'repurchase-self',
            'beginner-bonus',
            'startup-bonus',
            'leadership-bonus',
            'tour-fund',
            'health-education-fund',
            'bike-car-fund',
            'house-fund',
            'royalty-fund',
            'ssvpl-super-bonus',
            'lsp-bonus',
            'msp-bonus',
            'direct-referral'
        ]
    },
    grossAmount: { type: Number, required: true },
    adminCharge: { type: Number, default: 0 },
    tdsDeducted: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    scheduledFor: { type: Date }, // Friday or Month-end
    processedAt: { type: Date },
    metadata: {
        closings: Number,
        bvMatched: Number,
        leftBV: Number,
        rightBV: Number,
        unitsEarned: Number
    }
}, {
    timestamps: true
});

payoutSchema.index({ userId: 1, status: 1 });
payoutSchema.index({ memberId: 1 });
payoutSchema.index({ scheduledFor: 1 });

const Payout = mongoose.model('Payout', payoutSchema);
export default Payout;
