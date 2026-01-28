import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    bv: {
        type: Number,
        required: true,
        default: 0
    },
    image: {
        url: {
            type: String,
            required: true
        },
        publicId: {
            type: String,
            required: true
        }
    },
    description: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        default: 0
    },
    segment: {
        type: String,
        required: true,
        enum: ['aquaculture', 'agriculture', 'personal care', 'health care', 'home care', 'luxury goods'],
        lowercase: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

productSchema.index({ name: 'text' });
productSchema.index({ segment: 1 });

const Product = mongoose.model('Product', productSchema);
export default Product;
