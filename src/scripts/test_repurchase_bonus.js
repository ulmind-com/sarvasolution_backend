import mongoose from 'mongoose';
import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';
import FranchiseSale from '../src/models/FranchiseSale.model.js';
import { bonusService } from '../src/services/business/bonus.service.js';
import RepurchaseBonusPool from '../src/models/RepurchaseBonusPool.model.js';
import moment from 'moment-timezone';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

async function runVerification() {
    try {
        console.log(chalk.cyan('Connecting to database...'));
        await mongoose.connect(process.env.MONGO_URI);
        console.log(chalk.green('Connected to database.'));

        // 1. Setup Test Users
        console.log(chalk.yellow('\n--- Step 1: Setup Test Users ---'));

        let user1 = await User.findOne({ memberId: 'TEST001' });
        if (!user1) {
            user1 = await User.create({
                fullName: 'Eligible User',
                email: 'eligible@test.com',
                phone: '1234567890',
                password: 'password123',
                memberId: 'TEST001',
                status: 'active',
                isFirstPurchaseDone: true
            });
            await UserFinance.create({ user: user1._id, memberId: 'TEST001' });
        } else {
            // Reset state
            await UserFinance.updateOne({ user: user1._id }, {
                "selfPurchase.repurchaseWindowBV": 0,
                "selfPurchase.eligibleForRepurchaseBonus": false
            });
            await User.updateOne({ _id: user1._id }, {
                "selfPurchase.repurchaseWindowBV": 0,
                "selfPurchase.eligibleForRepurchaseBonus": false
            });
        }

        let user2 = await User.findOne({ memberId: 'TEST002' });
        if (!user2) {
            user2 = await User.create({
                fullName: 'Non-Eligible User',
                email: 'noneligible@test.com',
                phone: '1234567891',
                password: 'password123',
                memberId: 'TEST002',
                status: 'active',
                isFirstPurchaseDone: true
            });
            await UserFinance.create({ user: user2._id, memberId: 'TEST002' });
        }

        // 2. Create Mock Sales for Previous Month
        console.log(chalk.yellow('\n--- Step 2: Creating Mock Sales ---'));
        const prevMonth = moment().tz("Asia/Kolkata").subtract(1, 'month');
        const saleDate = prevMonth.clone().set('date', 5).toDate(); // 5th of prev month

        // Remove old test sales
        await FranchiseSale.deleteMany({ memberId: { $in: ['TEST001', 'TEST002'] } });

        // Sale for User 1 (Qualifies)
        await FranchiseSale.create({
            saleNo: 'TEST-SALE-001',
            saleDate: saleDate,
            franchise: user1._id, // Dummy franchise
            user: user1._id,
            memberId: user1.memberId,
            items: [],
            subTotal: 1000,
            gstAmount: 180,
            grandTotal: 1180,
            totalBV: 600, // > 500
            paymentStatus: 'paid'
        });

        // Set eligibility manually (as controller would have done)
        await UserFinance.updateOne({ user: user1._id }, {
            "selfPurchase.repurchaseWindowBV": 600,
            "selfPurchase.eligibleForRepurchaseBonus": true
        });

        // Sale for User 2 (Does not qualify - say total BV is 100,000 for pool)
        // We'll create a large sale to provide a pool
        await FranchiseSale.create({
            saleNo: 'TEST-SALE-BIG',
            saleDate: saleDate,
            franchise: user1._id,
            user: user2._id,
            memberId: user2.memberId,
            items: [],
            subTotal: 100000,
            gstAmount: 18000,
            grandTotal: 118000,
            totalBV: 10000,
            paymentStatus: 'paid'
        });

        console.log(chalk.green('Mock sales created. Total BV for month should be around 10,600.'));

        // 3. Run Distribution
        console.log(chalk.yellow('\n--- Step 3: Running Distribution ---'));
        await bonusService.processMonthlyRepurchaseBonusPool();

        // 4. Verify Results
        console.log(chalk.yellow('\n--- Step 4: Verifying Results ---'));
        const pool = await RepurchaseBonusPool.findOne({
            month: prevMonth.month() + 1,
            year: prevMonth.year()
        });

        if (pool) {
            console.log(chalk.cyan(`Pool Recorded: ₹${pool.poolAmount.toFixed(2)} (7% of ₹${pool.totalCompanyBV})`));
            console.log(chalk.cyan(`Qualifiers: ${pool.qualifierCount}`));
            console.log(chalk.cyan(`Bonus per head: ₹${pool.bonusPerHead.toFixed(2)}`));
        } else {
            console.log(chalk.red('Pool record not found!'));
        }

        const finance1 = await UserFinance.findOne({ user: user1._id });
        console.log(chalk.cyan(`User 1 (${user1.fullName}) bonus earned: ₹${finance1.selfPurchase.bonusEarned.toFixed(2)}`));

        const finance2 = await UserFinance.findOne({ user: user2._id });
        console.log(chalk.cyan(`User 2 (${user2.fullName}) bonus earned: ₹${finance2.selfPurchase.bonusEarned.toFixed(2)}`));

        if (finance1.selfPurchase.bonusEarned > 0 && finance2.selfPurchase.bonusEarned === 0) {
            console.log(chalk.green('\n✅ VERIFICATION SUCCESSFUL!'));
        } else {
            console.log(chalk.red('\n❌ VERIFICATION FAILED!'));
        }

    } catch (error) {
        console.error(chalk.red('Verification Error:'), error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

runVerification();
