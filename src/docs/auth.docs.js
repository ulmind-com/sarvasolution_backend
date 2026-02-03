/**
 * @swagger
 * /api/v1/register/user:
 *   post:
 *     summary: Register a new user in the SSVPL System (Public)
 *     description: |
 *       **Public Access** - Register a new user in the MLM system.
 *       
 *       **Mandatory Step**: All users must register through this endpoint before they can access the system.
 *       Upon registration, the user is placed in the binary tree (Genealogy) and assigned an initial 500 BV package.
 *     tags:
 *       - Public - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - fullName
 *               - phone
 *               - sponsorId
 *               - panCardNumber
 *             properties:
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
 *               panCardNumber:
 *                 type: string
 *               preferredPosition:
 *                 type: string
 *                 enum: [left, right]
 *                 description: "Optional. 'left' places user at extreme left of sponsor's left leg. 'right' places at extreme right of sponsor's right leg. Defaults to auto-balance (extreme left spillover)."
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
 *         $ref: '#/components/responses/BadRequest'
 * 
 * /api/v1/login/user:
 *   post:
 *     summary: User Login (Public)
 *     description: |
 *       **Public Access** - Authenticate using your Member ID and password.
 *       
 *       **Mandatory Registration Required** - You must register first to get your Member ID (SVSxxxxxx).
 *     tags:
 *       - Public - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - memberId
 *               - password
 *             properties:
 *               memberId:
 *                 type: string
 *                 example: SVS000001
 *               password:
 *                 type: string
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
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 * 
 * /api/v1/profile:
 *   get:
 *     summary: Get logged in user profile (User only)
 *     description: |
 *       **User Access Only** - Retrieve your complete profile information including bank details.
 *     tags:
 *       - User - Profile
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
 *                       $ref: '#/components/schemas/User'
 *                     bankAccount:
 *                       type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 * 
 *   patch:
 *     summary: Update profile details (User only)
 *     description: |
 *       **User Access Only** - Update your profile information including profile picture, address, and bank details.
 *     tags:
 *       - User - Profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               panCardNumber:
 *                 type: string
 *               username:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *               address:
 *                 type: object
 *                 description: JSON string if using multipart/form-data
 *               bankDetails:
 *                 type: object
 *                 description: JSON string if using multipart/form-data
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 * /api/v1/kyc/submit:
 *   post:
 *     summary: Submit KYC documents - One-time only (User only)
 *     description: |
 *       **User Access Only** - Submit your KYC (Know Your Customer) documents for verification.
 *       
 *       **One-time submission** - You can only submit KYC documents once. Make sure all details are correct.
 *     tags:
 *       - User - KYC
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - aadhaarNumber
 *               - panCardNumber
 *               - aadhaarFront
 *               - aadhaarBack
 *               - panImage
 *             properties:
 *               aadhaarNumber:
 *                 type: string
 *               panCardNumber:
 *                 type: string
 *               aadhaarFront:
 *                 type: string
 *                 format: binary
 *               aadhaarBack:
 *                 type: string
 *                 format: binary
 *               panImage:
 *                 type: string
 *                 format: binary
 *               bankDetails:
 *                 type: object
 *                 description: JSON string if using multipart/form-data
 *     responses:
 *       200:
 *         description: KYC submitted successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
