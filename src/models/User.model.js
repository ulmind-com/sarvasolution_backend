import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    // Basic Information
    username: { type: String, trim: true, lowercase: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    panCardNumber: { type: String, trim: true, uppercase: true },

    // MLM Structure
    memberId: { type: String, unique: true, required: true },
    sponsorId: { type: String, default: null },
    parentId: { type: String, default: null },
    position: { type: String, enum: ['left', 'right', 'root'], default: null },
    leftChild: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rightChild: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // BV Tracking System (SSVPL Standard)
    personalBV: { type: Number, default: 0 },
    leftLegBV: { type: Number, default: 0 },
    rightLegBV: { type: Number, default: 0 },
    totalBV: { type: Number, default: 0 },
    thisMonthBV: { type: Number, default: 0 },
    thisYearBV: { type: Number, default: 0 },
    carryForwardLeft: { type: Number, default: 0 },
    carryForwardRight: { type: Number, default: 0 },
    lastBVUpdate: { type: Date, default: Date.now },

    // 4 Fund Systems (Image 1)
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

    // 13 Rank System (Image 8)
    currentRank: {
        type: String,
        default: 'Associate',
        enum: [
            'Associate', 'Bronze', 'Silver', 'Gold', 'Platinum',
            'Diamond', 'Blue Diamond', 'Black Diamond', 'Royal Diamond',
            'Crown Diamond', 'Ambassador', 'Crown Ambassador', 'SSVPL Legend'
        ]
    },
    rankNumber: { type: Number, default: 14 }, // 13 is lowest (Bronze), 1 is highest (Legend)
    starMatching: { type: Number, default: 0 },
    rankBonus: { type: Number, default: 0 },
    achievedDate: Date,
    nextRankRequirement: { type: String },
    rankHistory: [{
        rank: String,
        date: { type: Date, default: Date.now }
    }],

    // Repurchase Bonus Tracking (Image 7)
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

    // Bonus Income Tracking (Fast Track & Matching)
    fastTrack: {
        dailyEarnings: { type: Number, default: 0 },
        weeklyEarnings: { type: Number, default: 0 },
        monthlyEarnings: { type: Number, default: 0 },
        totalEarned: { type: Number, default: 0 },
        dailyClosings: { type: Number, default: 0 }
    },
    starMatchingBonus: { // Refined field name
        dailyEarnings: { type: Number, default: 0 },
        weeklyEarnings: { type: Number, default: 0 },
        monthlyEarnings: { type: Number, default: 0 },
        totalEarned: { type: Number, default: 0 },
        dailyClosings: { type: Number, default: 0 }
    },

    // Stock Points (Image 1)
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
    },

    // Compliance & Wallet
    directSponsors: {
        count: { type: Number, default: 0 },
        members: [{ type: String }], // Array of memberIds
        eligibleForBonuses: { type: Boolean, default: false }
    },
    compliance: {
        minimumWithdrawal: { type: Number, default: 450 },
        adminChargePercent: { type: Number, default: 5 },
        tdsPercent: { type: Number, default: 0 }, // Set per region/rule
        autoRankUpgrade: { type: Boolean, default: true }
    },
    wallet: {
        totalEarnings: { type: Number, default: 0 },
        availableBalance: { type: Number, default: 0 },
        withdrawnAmount: { type: Number, default: 0 },
        pendingWithdrawal: { type: Number, default: 0 }
    },

    // Profile & KYC (Preserved)
    address: {
        street: String, city: String, state: String, country: String, zipCode: String
    },
    kyc: {
        status: { type: String, enum: ['none', 'pending', 'verified', 'rejected'], default: 'none' },
        aadhaarNumber: { type: String, trim: true },
        aadhaarFront: { url: String, publicId: String },
        aadhaarBack: { url: String, publicId: String },
        panImage: { url: String, publicId: String },
        submittedAt: Date,
        verifiedAt: Date,
        rejectionReason: String
    },
    profilePicture: {
        url: { type: String, default: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT11ii7P372sU9BZPZgOR6ohoQbBJWbkJ0OVA&s' },
        publicId: { type: String, default: null }
    },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' }

}, {
    timestamps: true
});

// Password Hashing
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

// Compare Password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Generate unique member ID
userSchema.statics.generateMemberId = async function () {
    const count = await this.countDocuments();
    return `SVS${String(count + 1).padStart(6, '0')}`;
};

// Indexes
userSchema.index({ sponsorId: 1 });
userSchema.index({ parentId: 1 });
userSchema.index({ panCardNumber: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ email: 1 });
userSchema.index({ memberId: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);
export default User;
