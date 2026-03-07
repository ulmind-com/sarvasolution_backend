import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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
        const { mlmService } = await import('../src/services/business/mlm.service.js');
        const User = (await import('../src/models/User.model.js')).default;

        const superUser = await User.findOne({ memberId: 'SVS000001' }).lean();
        const tree = await mlmService.getGenealogyTree(superUser._id);

        console.log("Raw getGenealogyTree root node:");
        console.log(JSON.stringify(tree, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

runScript();
