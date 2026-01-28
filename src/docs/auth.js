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
 *         multipart/form-data:
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
 *               joiningPackage:
 *                 type: number
 *                 enum: [500, 1000, 2000, 5000, 10000]
 *               preferredPosition:
 *                 type: string
 *                 enum: [left, right]
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *                 description: Profile image file
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
 * 
 * /api/v1/login/user:
 *   post:
 *     summary: Login user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email or Member ID
 *                 example: rootadmin
 *               password:
 *                 type: string
 *                 description: User password
 *                 example: adminpassword123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     memberId:
 *                       type: string
 *       400:
 *         description: Missing credentials
 *       401:
 *         description: Invalid credentials
 * 
 * /api/v1/profile:
 *   get:
 *     summary: Get logged in user profile
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
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
 *                     user:
 *                       type: object
 *                     bankAccount:
 *                       type: object
 *                       properties:
 *                         accountName:
 *                           type: string
 *                         accountNumber:
 *                           type: string
 *                         bankName:
 *                           type: string
 *                         ifscCode:
 *                           type: string
 *                         branch:
 *                           type: string
 *       401:
 *         description: Unauthorized
 * 
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
