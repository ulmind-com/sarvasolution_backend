import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_URI);

// Import the actual service and call it like the API does
const { default: mlmService } = await import('../src/services/business/mlm.service.js');
const { default: User } = await import('../src/models/User.model.js');

const superUser = await User.findOne({ memberId: 'SVS000001' }).lean();
const tree = await mlmService.getGenealogyTree(superUser._id, 3);

// Check what the API returns for Super's BV fields
const apiResult = {
    memberId: tree.memberId,
    leftLegBV: tree.leftLegBV,
    rightLegBV: tree.rightLegBV,
    thisMonthLeftLegBV: tree.thisMonthLeftLegBV,
    thisMonthRightLegBV: tree.thisMonthRightLegBV,
    leftDirectActive: tree.leftDirectActive,
    leftDirectInactive: tree.leftDirectInactive,
};

// Also check the left child (SVS000002)
if (tree.left) {
    apiResult.leftChild = {
        memberId: tree.left.memberId,
        leftLegBV: tree.left.leftLegBV,
        rightLegBV: tree.left.rightLegBV,
        thisMonthLeftLegBV: tree.left.thisMonthLeftLegBV,
        thisMonthRightLegBV: tree.left.thisMonthRightLegBV,
    };
}

fs.writeFileSync(path.join(__dirname, 'api_tree_output.json'), JSON.stringify(apiResult, null, 2));
console.log('Done');
process.exit(0);
