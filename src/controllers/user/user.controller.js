import User from '../../models/User.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export const getDirectTeam = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const leg = req.query.leg; // 'left', 'right', or undefined (all)
        const skip = (page - 1) * limit;

        const query = { sponsorId: req.user.memberId };

        if (leg && (leg === 'left' || leg === 'right')) {
            query.sponsorLeg = leg;
        }

        const team = await User.find(query)
            .select('fullName memberId currentRank totalBV joiningDate status sponsorLeg profilePicture')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments(query);

        return res.status(200).json(
            new ApiResponse(200, {
                team,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            }, "Direct team fetched successfully")
        );
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong fetching direct team");
    }
};
