/**
 * @swagger
 * /api/v1/register/user:
 *   post:
 *     summary: Register a new user in the Binary MLM system
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - fullName
 *               - phone
 *               - sponsorId
 *               - joiningPackage
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               sponsorId:
 *                 type: string
 *                 description: Member ID of the sponsor
 *               joiningPackage:
 *                 type: number
 *                 enum: [500, 1000, 2000, 5000, 10000]
 *               preferredPosition:
 *                 type: string
 *                 enum: [left, right]
 *               bankDetails:
 *                 type: object
 *                 properties:
 *                   accountName:
 *                     type: string
 *                   accountNumber:
 *                     type: string
 *                   bankName:
 *                     type: string
 *                   ifscCode:
 *                     type: string
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   country:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     memberId:
 *                       type: string
 *                     token:
 *                       type: string
 *       400:
 *         description: Bad request (validation error, user exists)
 *       500:
 *         description: Server error
 */
