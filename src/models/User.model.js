import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    // Basic Information
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },

    // MLM Structure
    memberId: {
        type: String,
        unique: true,
        required: true
    },
    sponsorId: {
        type: String,
        ref: 'User',
        default: null
    },
    parentId: {
        type: String,
        ref: 'User',
        default: null
    },
    position: {
        type: String,
        enum: ['left', 'right', 'root'],
        default: null
    },

    // Genealogy Tree References
    leftChild: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    rightChild: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    // Package & Financial
    joiningPackage: {
        type: Number,
        required: true,
        enum: [500, 1000, 2000, 5000, 10000] // Define your packages
    },
    joiningDate: {
        type: Date,
        default: Date.now
    },

    // Point Values (PV)
    personalPV: {
        type: Number,
        default: 0
    },
    leftLegPV: {
        type: Number,
        default: 0
    },
    rightLegPV: {
        type: Number,
        default: 0
    },
    totalPV: {
        type: Number,
        default: 0
    },

    // Commission Tracking
    totalCommission: {
        type: Number,
        default: 0
    },
    withdrawnCommission: {
        type: Number,
        default: 0
    },
    pendingCommission: {
        type: Number,
        default: 0
    },

    // Carry Forward (for unmatched PV)
    carryForwardLeft: {
        type: Number,
        default: 0
    },
    carryForwardRight: {
        type: Number,
        default: 0
    },

    // Binary Capping
    dailyCap: {
        type: Number,
        default: 5000 // Set based on joining package
    },
    weeklyCap: {
        type: Number,
        default: 30000
    },
    monthlyCap: {
        type: Number,
        default: 100000
    },

    // Status & Rank
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    rank: {
        type: String,
        default: 'Member',
        enum: ['Member', 'Silver', 'Gold', 'Platinum', 'Diamond']
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },

    // Banking Details
    // bankDetails: {
    //     accountName: String,
    //     accountNumber: String,
    //     bankName: String,
    //     ifscCode: String,
    //     branch: String
    // },

    // Address
    address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String
    },

    // Profile Picture
    profilePicture: {
        url: {
            type: String,
            default: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT11ii7P372sU9BZPZgOR6ohoQbBJWbkJ0OVA&s'
        },
        publicId: {
            type: String,
            default: null
        }
    },

    // Metadata
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    passwordResetToken: String,
    passwordResetExpires: Date

}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});

// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Generate unique member ID
userSchema.statics.generateMemberId = async function () {
    // Use try-catch or ensure we can access model within static context
    // 'this' refers to the model
    const count = await this.countDocuments();
    return `SVS${String(count + 1).padStart(6, '0')}`; // SVS000001, SVS000002...
};

// Add indexes
userSchema.index({ sponsorId: 1 });
userSchema.index({ parentId: 1 });

const User = mongoose.model('User', userSchema);
export default User;
