import mongoose from 'mongoose';

const userFinanceSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
    memberId: { type: String, unique: true, required: true, index: true }, // Redundant but useful for quick lookups

    // BV Tracking System (SSVPL Standard)
    personalBV: { type: Number, default: 0 },
    leftLegBV: { type: Number, default: 0 },
    rightLegBV: { type: Number, default: 0 },
    totalBV: { type: Number, default: 0 }, // Cumulative
    thisMonthBV: { type: Number, default: 0 },
    thisYearBV: { type: Number, default: 0 },
    carryForwardLeft: { type: Number, default: 0 },
    carryForwardRight: { type: Number, default: 0 },
    lastBVUpdate: { type: Date, default: Date.now },

    // PV Tracking System
    personalPV: { type: Number, default: 0 },
    leftLegPV: { type: Number, default: 0 },
    rightLegPV: { type: Number, default: 0 },
    totalPV: { type: Number, default: 0 },
    thisMonthPV: { type: Number, default: 0 },
    thisYearPV: { type: Number, default: 0 },

    // Wallet
    wallet: {
        totalEarnings: { type: Number, default: 0 },
        availableBalance: { type: Number, default: 0 },
        withdrawnAmount: { type: Number, default: 0 },
        pendingWithdrawal: { type: Number, default: 0 }
    },

    // 13 Rank System
    currentRank: {
        type: String,
        default: 'Associate',
        enum: [
            'Associate', 'Bronze', 'Silver', 'Gold', 'Platinum',
            'Diamond', 'Blue Diamond', 'Black Diamond', 'Royal Diamond',
            'Crown Diamond', 'Ambassador', 'Crown Ambassador', 'SSVPL Legend'
        ]
    },
    rankNumber: { type: Number, default: 14 }, // 13 is lowest (Bronze), 14 is Associate, ... wait. Logic was 13=Bronze? No, typically 1=Highest.
    // Keeping logic consistent with previous User model: 14 (Associate/None) -> 1 (Legend)
    starMatching: { type: Number, default: 0 },
    rankBonus: { type: Number, default: 0 }, // Total rank bonus earned
    achievedDate: Date,
    nextRankRequirement: { type: String },
    rankHistory: [{
        rank: String,
        date: { type: Date, default: Date.now }
    }],

    // 4 Fund Systems
    bikeCarFund: {
        units: { type: Number, default: 0 },
        totalBVContributed: { type: Number, default: 0 },
        lastAchieved: Date,
        nextTargetBV: { type: Number, default: 100000 }
    },
    houseFund: {
        units: { type: Number, default: 0 },
        totalBVContributed: { type: Number, default: 0 },
        lastAchieved: Date,
        nextTargetBV: { type: Number, default: 250000 },
        paymentSchedule: { type: String, default: 'half-yearly' }
    },
    royaltyFund: {
        units: { type: Number, default: 0 },
        totalBVContributed: { type: Number, default: 0 },
        lastAchieved: Date,
        nextTargetBV: { type: Number, default: 750000 },
        paymentSchedule: { type: String, default: 'annual' }
    },
    ssvplSuperBonus: {
        units: { type: Number, default: 0 },
        totalBVContributed: { type: Number, default: 0 },
        lastAchieved: Date,
        nextTargetBV: { type: Number, default: 2500000 }
    },

    // Repurchase & Other Bonuses
    selfPurchase: {
        totalPurchases: { type: Number, default: 0 },
        lastPurchaseDate: Date,
        thisMonthBV: { type: Number, default: 0 },
        bonusEarned: { type: Number, default: 0 },
        eligibleForPrize: { type: Boolean, default: false }
    },
    beginnerBonus: {
        units: { type: Number, default: 0 },
        cappingReached: { type: Number, default: 0 },
        cappingLimit: { type: Number, default: 10 },
        totalBV: { type: Number, default: 0 }
    },
    startUpBonus: { units: { type: Number, default: 0 }, totalBV: { type: Number, default: 0 } },
    leadershipBonus: { units: { type: Number, default: 0 }, totalBV: { type: Number, default: 0 } },
    tourFund: { units: { type: Number, default: 0 }, totalBV: { type: Number, default: 0 } },
    healthEducation: { units: { type: Number, default: 0 }, totalBV: { type: Number, default: 0 } },

    // Tracking
    fastTrack: {
        dailyEarnings: { type: Number, default: 0 },
        weeklyEarnings: { type: Number, default: 0 },
        monthlyEarnings: { type: Number, default: 0 },
        totalEarned: { type: Number, default: 0 },
        dailyClosings: { type: Number, default: 0 }
    },
    starMatchingBonus: {
        dailyEarnings: { type: Number, default: 0 },
        weeklyEarnings: { type: Number, default: 0 },
        monthlyEarnings: { type: Number, default: 0 },
        totalEarned: { type: Number, default: 0 },
        dailyClosings: { type: Number, default: 0 }
    },

    // Stock Points
    lsp: {
        achieved: { type: Boolean, default: false },
        achievedDate: Date,
        currentBV: { type: Number, default: 0 },
        targetBV: { type: Number, default: 100000 }
    },
    msp: {
        achieved: { type: Boolean, default: false },
        achievedDate: Date,
        currentBV: { type: Number, default: 0 },
        targetBV: { type: Number, default: 500000 }
    }

}, {
    timestamps: true
});

const UserFinance = mongoose.model('UserFinance', userFinanceSchema);
export default UserFinance;
