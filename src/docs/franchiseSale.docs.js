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
 *     description: |
 *       **Franchise Access Only** - Process a sale transaction to an MLM user.
 *       
 *       **Business Logic:**
 *       - Validates user and product availability
 *       - Deducts stock from franchise inventory
 *       - Calculates PV, BV, and GST (18%)
 *       - **Activation Rule**: First purchase with PV >= 1 activates the user account
 *       - Generates PDF invoice with tax breakdown (IGST for inter-state, CGST+SGST for intra-state)
 *       - Uploads invoice to Cloudinary and emails to user
 *       - Updates user's PV/BV accumulation
 *       
 *       **Note:** First purchase flag is set regardless of PV, but activation only occurs if PV >= 1.
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
 *                 example: "SVS000001"
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
 *                       description: Complete sale record with invoice details
 *                     userActivated:
 *                       type: boolean
 *                       description: True if user was activated by this purchase
 *                     isFirstPurchase:
 *                       type: boolean
 *                       description: True if this was user's first purchase
 *                     totalPV:
 *                       type: number
 *                       description: Total Point Value for this transaction
 *                     totalBV:
 *                       type: number
 *                       description: Total Business Volume for this transaction
 *                     invoiceUrl:
 *                       type: string
 *                       description: Cloudinary URL of generated PDF invoice
 *                     emailSent:
 *                       type: boolean
 *                       description: Whether invoice email was sent successfully
 *       400:
 *         description: Validation error or insufficient stock
 *       404:
 *         description: User or product not found
 */

