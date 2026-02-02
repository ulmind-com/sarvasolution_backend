import mongoose from 'mongoose';
import Payout from './src/models/Payout.model.js';
import UserFinance from './src/models/UserFinance.model.js';
import dotenv from 'dotenv';

dotenv.config();

const ADMIN_CHARGE_PERCENT = 0.05;
const TDS_PERCENT = 0.02;

async function fixTDS() {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

        if (!mongoUri) {
            console.error('❌ MongoDB URI not found in .env file');
            console.error('   Looking for: MONGODB_URI or MONGO_URI');
            process.exit(1);
        }

        console.log('\n🔗 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected\n');

        // Find payouts with incorrect TDS
        const wrongPayouts = await Payout.find({
            tdsDeducted: 0,
            grossAmount: { $gt: 0 },
            status: { $in: ['completed', 'pending'] },
            payoutType: { $ne: 'withdrawal' }
        });

        console.log(`Found ${wrongPayouts.length} payout(s) with TDS=0\n`);

        if (wrongPayouts.length === 0) {
            console.log('✅ All payouts already have correct TDS!');
            await mongoose.disconnect();
            return;
        }

        let fixed = 0;
        let totalRecovered = 0;

        for (const payout of wrongPayouts) {
            const correctTDS = Math.round(payout.grossAmount * TDS_PERCENT * 100) / 100;
            const correctAdmin = Math.round(payout.grossAmount * ADMIN_CHARGE_PERCENT * 100) / 100;
            const correctNet = Math.round((payout.grossAmount - correctTDS - correctAdmin) * 100) / 100;
            const overpayment = Math.round((payout.netAmount - correctNet) * 100) / 100;

            console.log(`Fixing Payout ${payout._id}:`);
            console.log(`  Member: ${payout.memberId}`);
            console.log(`  Gross: ₹${payout.grossAmount}`);
            console.log(`  Old: TDS=₹${payout.tdsDeducted}, Net=₹${payout.netAmount}`);
            console.log(`  New: TDS=₹${correctTDS}, Net=₹${correctNet}`);
            console.log(`  Overpayment: ₹${overpayment}`);

            // Update payout
            payout.adminCharge = correctAdmin;
            payout.tdsDeducted = correctTDS;
            payout.netAmount = correctNet;
            await payout.save();

            // Recover overpayment from wallet
            if (overpayment > 0) {
                const finance = await UserFinance.findOne({ user: payout.userId });
                if (finance) {
                    console.log(`  → Deducting ₹${overpayment} from wallet`);
                    finance.wallet.availableBalance = Math.max(0, finance.wallet.availableBalance - overpayment);
                    finance.wallet.totalEarnings = Math.max(0, finance.wallet.totalEarnings - overpayment);
                    await finance.save();
                }
            }

            fixed++;
            totalRecovered += overpayment;
            console.log('');
        }

        console.log('═'.repeat(70));
        console.log('✅ TDS FIX COMPLETE');
        console.log('═'.repeat(70));
        console.log(`Payouts Fixed: ${fixed}`);
        console.log(`Total Overpayment Recovered: ₹${totalRecovered.toFixed(2)}`);
        console.log('═'.repeat(70));
        console.log('\n✅ All payouts now have correct TDS deduction!\n');

        await mongoose.disconnect();
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

console.log('\n🚀 SSVPL MLM - TDS FIX SCRIPT\n');
fixTDS();
