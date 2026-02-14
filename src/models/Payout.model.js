import mongoose from 'mongoose';
import moment from 'moment-timezone';

const payoutSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    memberId: { type: String, required: true },
    payoutType: {
        type: String,
        required: true,
        enum: [
            'fast-track', // Keeping just in case
            'fast-track-bonus',
            'fast-track-deduction',
            'star-matching-bonus',
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
            'star-matching-flashout',
            'lsp-bonus',
            'msp-bonus',
            'direct-referral',
            'withdrawal',
            'rank-bonus',
            'fast-track-flashout'
        ]
    },
    grossAmount: { type: Number, required: true },
    adminCharge: { type: Number, default: 0 },
    tdsDeducted: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'deducted', 'flushed'],
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
    },
    // User Request: Store Indian Time explicitly for visibility
    createdAt_IST: {
        type: String,
        default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss')
    },
    updatedAt_IST: {
        type: String,
        default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss')
    }
}, {
    timestamps: true
});

// Middleware to update updatedAt_IST on save
payoutSchema.pre('save', function (next) {
    this.updatedAt_IST = moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss');
    next();
});

payoutSchema.index({ userId: 1, status: 1 });
payoutSchema.index({ memberId: 1 });
payoutSchema.index({ scheduledFor: 1 });

const Payout = mongoose.model('Payout', payoutSchema);
export default Payout;
