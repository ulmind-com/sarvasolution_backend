import mongoose from 'mongoose';
import moment from 'moment-timezone';

const beginnerBonusPoolSchema = new mongoose.Schema({
    month: {
        type: Number,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    totalCompanyBV: {
        type: Number,
        required: true,
        default: 0
    },
    poolAmount: {
        type: Number,
        required: true,
        default: 0
    },
    totalUnits: {
        type: Number,
        required: true,
        default: 0
    },
    pointValue: {
        type: Number,
        required: true,
        default: 0
    },
    qualifierCount: {
        type: Number,
        required: true,
        default: 0
    },
    isProcessed: {
        type: Boolean,
        default: false
    },
    processedAt: {
        type: Date
    },
    // Timezone Fields
    createdAt_IST: { type: String, default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss') },
    updatedAt_IST: { type: String, default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss') }
}, {
    timestamps: true
});

beginnerBonusPoolSchema.pre('save', function (next) {
    this.updatedAt_IST = moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss');
    next();
});

const BeginnerBonusPool = mongoose.model('BeginnerBonusPool', beginnerBonusPoolSchema);
export default BeginnerBonusPool;
