import mongoose from 'mongoose';
import User from '../src/models/User.model.js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function run() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sarvasolution', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    // Find SVS000007
    const user = await User.findOne({ memberId: 'SVS000007' });
    console.log('Wallet data for SVS000007:', user ? user.wallet : 'User not found');

    // Find out if ANY user has balance > 0
    const richestUser = await User.findOne({ 'wallet.availableBalance': { $gt: 0 } });
    if (richestUser) {
        console.log(`User ${richestUser.memberId} has balance:`, richestUser.wallet);
    } else {
        console.log('NO USER has availableBalance > 0 in the entire DB.');
    }

    process.exit(0);
}
run();
