import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const runScript = async () => {
    await connectDB();
    try {
        const superUser = await User.findOne({ memberId: 'SVS000001' }).lean();
        const adilUser = await User.findOne({ memberId: 'SVS000002' }).lean();

        const superFin = await UserFinance.findOne({ user: superUser._id }).lean();
        const adilFin = await UserFinance.findOne({ user: adilUser._id }).lean();

        console.log('--- SUPER (SVS000001) ---');
        console.log(`User: thisMonthLeftLegBV=${superUser.thisMonthLeftLegBV}`);
        console.log(`Finance: leftLegBV=${superFin.leftLegBV}, thisMonthLeftLegBV=${superFin.thisMonthLeftLegBV}`);

        console.log('\n--- ADIL (SVS000002) ---');
        console.log(`Finance: totalBV=${adilFin.totalBV}, personalBV=${adilFin.personalBV}, thisMonthBV=${adilFin.thisMonthBV}, status=${adilUser.status}`);

        const { mlmService } = await import('../src/services/business/mlm.service.js');
        const tree = await mlmService.getGenealogyTree(superUser._id);

        console.log('\n--- Tree node Super ---');
        console.log(`leftLegBV: ${tree.leftLegBV}, thisMonthLeftLegBV: ${tree.thisMonthLeftLegBV}`);
        console.log(`leftDirectActive: ${tree.leftDirectActive}, leftDirectInactive: ${tree.leftDirectInactive}`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

runScript();
