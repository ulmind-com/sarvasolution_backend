import User from '../../models/User.model.js';
import BankAccount from '../../models/BankAccount.model.js';

export const getProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        const user = await User.findById(userId).select('-password');
        const bankAccount = await BankAccount.findOne({ userId });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                user,
                bankAccount: bankAccount || null
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error retrieving profile',
            error: error.message
        });
    }
};
