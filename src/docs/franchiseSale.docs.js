/**
 * @swagger
 * tags:
 *   name: Franchise - Sales
 *   description: Franchise sales to end users (MLM members)
 */

/**
 * @swagger
 * /api/v1/franchise/sale/user/{memberId}:
 *   get:
 *     summary: Get user details by Member ID
 *     tags: [Franchise - Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *         description: User's unique member ID (e.g., SS000001)
 *     responses:
 *       200:
 *         description: User details fetched successfully
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/v1/franchise/sale/sell:
 *   post:
 *     summary: Sell products to user
 *     tags: [Franchise - Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [memberId, items]
 *             properties:
 *               memberId:
 *                 type: string
 *                 example: "SS000001"
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                       minimum: 1
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, card, upi, bank_transfer]
 *                 default: cash
 *     responses:
 *       201:
 *         description: Sale completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     sale:
 *                       type: object
 *                     userActivated:
 *                       type: boolean
 *                     isFirstPurchase:
 *                       type: boolean
 *                     totalPV:
 *                       type: number
 *                     totalBV:
 *                       type: number
 *       400:
 *         description: Validation error or insufficient stock
 *       404:
 *         description: User or product not found
 */
