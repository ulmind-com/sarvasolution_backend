import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Franchise from '../src/models/Franchise.model.js';
import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';

dotenv.config({ path: './.env' });

const migrateData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for migration...');

        // 1. Migrate Franchises: Rename specific fields to match Address Schema
        // Issue: Franchise had 'pincode', AddressSchema expects 'zipCode'
        console.log('Migrating Franchises...');
        const franchises = await Franchise.find({});
        let franchiseUpdates = 0;

        for (const franchise of franchises) {
            let modified = false;

            // Check for 'pincode' in shopAddress and move to 'zipCode'
            // accessing via _doc or toObject to see invisible fields if schema restricts?
            // Since we updated the model, 'pincode' is not in the schema anymore. 
            // We need to use lean() or strict: false to access it? 
            // Or just $rename with updateMany? $rename is safer for DB-side field moves.
        }

        // Better approach: Use database-level operations for field renaming
        const result = await Franchise.collection.updateMany(
            { 'shopAddress.pincode': { $exists: true }, 'shopAddress.zipCode': { $exists: false } },
            { $rename: { 'shopAddress.pincode': 'shopAddress.zipCode' } }
        );
        console.log(`Renamed 'pincode' into 'zipCode' for ${result.modifiedCount} franchises.`);

        // 2. Migrate Users: Ensure defaulted objects exist
        // New schema has default values for funds. Existing docs might lack them.
        console.log('Migrating Users...');
        const userUpdateResult = await User.updateMany(
            { bikeCarFund: { $exists: false } },
            {
                $set: {
                    bikeCarFund: { units: 0, totalBVContributed: 0, nextTargetBV: 100000 },
                    houseFund: { units: 0, totalBVContributed: 0, nextTargetBV: 250000, paymentSchedule: 'half-yearly' },
                    royaltyFund: { units: 0, totalBVContributed: 0, nextTargetBV: 750000, paymentSchedule: 'annual' },
                    ssvplSuperBonus: { units: 0, totalBVContributed: 0, nextTargetBV: 2500000 },
                    kyc: { status: 'none' },
                    address: {}
                }
            }
        );
        console.log(`Initialized missing funds/kyc for ${userUpdateResult.modifiedCount} users.`);

        // 3. Migrate UserFinance
        console.log('Migrating UserFinance...');
        const financeUpdateResult = await UserFinance.updateMany(
            { bikeCarFund: { $exists: false } },
            {
                $set: {
                    bikeCarFund: { units: 0, totalBVContributed: 0, nextTargetBV: 100000 },
                    houseFund: { units: 0, totalBVContributed: 0, nextTargetBV: 250000, paymentSchedule: 'half-yearly' },
                    royaltyFund: { units: 0, totalBVContributed: 0, nextTargetBV: 750000, paymentSchedule: 'annual' },
                    ssvplSuperBonus: { units: 0, totalBVContributed: 0, nextTargetBV: 2500000 }
                }
            }
        );
        console.log(`Initialized missing funds for ${financeUpdateResult.modifiedCount} UserFinance records.`);

        console.log('Migration completed successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
    }
};

migrateData();
