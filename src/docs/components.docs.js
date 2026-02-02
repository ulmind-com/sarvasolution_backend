/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 *   schemas:
 *     Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *         error:
 *           type: string
 * 
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         memberId:
 *           type: string
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         fullName:
 *           type: string
 *         phone:
 *           type: string
 *         panCardNumber:
 *           type: string
 *         sponsorId:
 *           type: string
 *         parentId:
 *           type: string
 *         position:
 *           type: string
 *           enum: [left, right, root]
 *         currentRank:
 *           type: string
 *           enum: [Associate, Star, Bronze, Silver, Gold, Platinum, Diamond, Blue Diamond, Black Diamond, Royal Diamond, Crown Diamond, Ambassador, Crown Ambassador, SSVPL Legend]
 *         starMatching:
 *           type: number
 *         personalBV:
 *           type: number
 *         leftLegBV:
 *           type: number
 *         rightLegBV:
 *           type: number
 *         totalBV:
 *           type: number
 *         wallet:
 *           type: object
 *           properties:
 *             totalEarnings:
 *               type: number
 *             availableBalance:
 *               type: number
 *             withdrawnAmount:
 *               type: number
 *         status:
 *           type: string
 *           enum: [active, inactive, suspended]
 * 
 *     Payout:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         memberId:
 *           type: string
 *         payoutType:
 *           type: string
 *           enum: [direct-referral, rank-bonus, fast-track-bonus, star-matching-bonus, withdrawal, fast-track-deduction]
 *         grossAmount:
 *           type: number
 *         adminCharge:
 *           type: number
 *         tdsDeducted:
 *           type: number
 *         netAmount:
 *           type: number
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, failed, deducted]
 *         scheduledFor:
 *           type: string
 *           format: date-time
 * 
 *     BVTransaction:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         transactionType:
 *           type: string
 *           enum: [joining, repurchase, downline, admin-adjustment]
 *         bvAmount:
 *           type: number
 *         legAffected:
 *           type: string
 *           enum: [left, right, personal, none]
 *         createdAt:
 *           type: string
 *           format: date-time
 * 
 *     Product:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         bv:
 *           type: number
 *         price:
 *           type: number
 *         description:
 *           type: string
 *         segment:
 *           type: string
 *         image:
 *           type: object
 *           properties:
 *             url:
 *               type: string
 *             publicId:
 *               type: string
 *         isActive:
 *           type: boolean
 * 
 *   responses:
 *     BadRequest:
 *       description: Bad Request
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     Unauthorized:
 *       description: Unauthorized
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     Forbidden:
 *       description: Forbidden
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     NotFound:
 *       description: Not Found
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     Error:
 *       description: Internal Server Error
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 */
