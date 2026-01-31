/**
 * @swagger
 * tags:
 *   name: User Financials
 *   description: BV summaries, fund tracking, and payout management
 */

/**
 * @swagger
 * /api/v1/user/bv-summary:
 *   get:
 *     summary: Get BV balance and transaction history
 *     tags: [User Financials]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: BV Summary fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary: { $ref: '#/components/schemas/User' }
 *                     recentTransactions: { type: array, items: { $ref: '#/components/schemas/BVTransaction' } }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/user/funds-status:
 *   get:
 *     summary: Get status of all 4 Funds (Bike, House, Royalty, Super)
 *     tags: [User Financials]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Funds status fetched
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/user/wallet:
 *   get:
 *     summary: Get wallet balance and payout history
 *     tags: [User Financials]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet info fetched
 */

/**
 * @swagger
 * /api/v1/user/request-payout:
 *   post:
 *     summary: Request a withdrawal (Payout)
 *     description: Minimum withdrawal is ₹450. Processing occurs every Friday at 11 AM IST.
 *     tags: [User Financials]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number, example: 500 }
 *     responses:
 *       201:
 *         description: Payout request submitted
 *       400:
 *         description: Insufficient balance or below minimum
 */

/**
 * @swagger
 * /api/v1/user/tree/{memberId}:
 *   get:
 *     summary: Fetch Genealogy Tree Structure
 *     description: Returns a recursive tree structure (Left/Right) for the specified member. If no memberId is provided, returns starting from the logged-in user.
 *     tags: [User Financials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: false
 *         schema:
 *           type: string
 *         example: SVS000001
 *     responses:
 *       200:
 *         description: Tree structure retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     memberId: { type: string }
 *                     fullName: { type: string }
 *                     rank: { type: string }
 *                     position: { type: string }
 *                     profileImage: { type: string }
 *                     sponsorId: { type: string }
 *                     joiningDate: { type: string, format: date-time }
 *                     status: { type: string, enum: [active, inactive, blocked] }
 *                     leftDirectActive: { type: integer }
 *                     leftDirectInactive: { type: integer }
 *                     rightDirectActive: { type: integer }
 *                     rightDirectInactive: { type: integer }
 *                     left: { type: object }
 *                     right: { type: object }
 */

/**
 * @swagger
 * /api/v1/user/tree_view:
 *   get:
 *     summary: Fetch Genealogy Tree (Simplified)
 *     description: Alias for fetching the tree structure. Supports optional depth parameter.
 *     tags: [User Financials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: depth
 *         required: false
 *         schema:
 *           type: integer
 *           default: 3
 *           maximum: 10
 *         description: Depth of the tree to retrieve (Max 10)
 *     responses:
 *       200:
 *         description: Tree structure retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     memberId: { type: string }
 *                     fullName: { type: string }
 *                     rank: { type: string }
 *                     position: { type: string }
 *                     profileImage: { type: string }
 *                     sponsorId: { type: string }
 *                     joiningDate: { type: string, format: date-time }
 *                     status: { type: string, enum: [active, inactive, blocked] }
 *                     leftDirectActive: { type: integer }
 *                     leftDirectInactive: { type: integer }
 *                     rightDirectActive: { type: integer }
 *                     rightDirectInactive: { type: integer }
 *                     left: { type: object }
 *                     right: { type: object }
 */

/**
 * @swagger
 * /api/v1/user/payouts:
 *   get:
 *     summary: Get Payout History
 *     tags: [User Financials]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payout history fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payout'
 */

/**
 * @swagger
 * /api/v1/user/direct-team:
 *   get:
 *     summary: Get Direct Team List
 *     description: Retrieve a paginated list of directly sponsored members, optionally filtered by leg.
 *     tags: [User Financials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: leg
 *         schema:
 *           type: string
 *           enum: [left, right]
 *         description: Filter by leg (optional)
 *     responses:
 *       200:
 *         description: Direct team fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     team:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           memberId: { type: string }
 *                           fullName: { type: string }
 *                           currentRank: { type: string }
 *                           totalBV: { type: number }
 *                           joiningDate: { type: string, format: date-time }
 *                           status: { type: string }
 *                           sponsorLeg: { type: string }
 *                           profilePicture: { type: object, properties: { url: { type: string } } }
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total: { type: integer }
 *                         page: { type: integer }
 *                         limit: { type: integer }
 *                         pages: { type: integer }
 */
