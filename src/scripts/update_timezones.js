import mongoose from 'mongoose';
import dotenv from 'dotenv';
import moment from 'moment-timezone';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

// Load Env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import Models
import User from '../models/User.model.js';
import UserFinance from '../models/UserFinance.model.js';
import Payout from '../models/Payout.model.js';
import Product from '../models/Product.model.js';
import ProductRequest from '../models/ProductRequest.model.js';
import FranchiseSale from '../models/FranchiseSale.model.js';
import BVTransaction from '../models/BVTransaction.model.js';
import BankAccount from '../models/BankAccount.model.js';
import Franchise from '../models/Franchise.model.js';
import FranchiseInventory from '../models/FranchiseInventory.model.js';
import Invoice from '../models/Invoice.model.js';
import StockTransaction from '../models/StockTransaction.model.js';

const models = [
    { name: 'User', model: User },
    { name: 'UserFinance', model: UserFinance },
    { name: 'Payout', model: Payout },
    { name: 'Product', model: Product },
    { name: 'ProductRequest', model: ProductRequest },
    { name: 'FranchiseSale', model: FranchiseSale },
    { name: 'BVTransaction', model: BVTransaction },
    { name: 'BankAccount', model: BankAccount },
    { name: 'Franchise', model: Franchise },
    { name: 'FranchiseInventory', model: FranchiseInventory },
    { name: 'Invoice', model: Invoice },
    { name: 'StockTransaction', model: StockTransaction }
];

const updateTimezones = async () => {
    try {
        console.log(chalk.blue('Connecting to MongoDB...'));
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sarvasolution_mlm');
        console.log(chalk.green('Connected to MongoDB.'));

        for (const { name, model } of models) {
            console.log(chalk.cyan(`\nProcessing ${name}...`));

            const docs = await model.find({});
            console.log(`Found ${docs.length} documents.`);

            let updatedCount = 0;
            const bulkOps = [];

            for (const doc of docs) {
                // Determine format based on existing fields
                // If createdAt exists, convert to IST string
                // If not, maybe use _id timestamp

                const createdDate = doc.createdAt || doc._id.getTimestamp();
                const updatedDate = doc.updatedAt || doc.createdAt || new Date();

                const createdAt_IST = moment(createdDate).tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss');
                const updatedAt_IST = moment(updatedDate).tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss');

                // Prepare Update Operation
                bulkOps.push({
                    updateOne: {
                        filter: { _id: doc._id },
                        update: {
                            $set: {
                                createdAt_IST: createdAt_IST,
                                updatedAt_IST: updatedAt_IST
                            }
                        }
                    }
                });

                updatedCount++;
            }

            if (bulkOps.length > 0) {
                await model.bulkWrite(bulkOps);
                console.log(chalk.green(`✓ Updated ${updatedCount} documents in ${name}`));
            } else {
                console.log(chalk.yellow(`- No documents to update in ${name}`));
            }
        }

        console.log(chalk.magenta('\nGlobal Timezone Update Completed successfully.'));
        process.exit(0);

    } catch (error) {
        console.error(chalk.red('Migration Error:'), error);
        process.exit(1);
    }
};

updateTimezones();
