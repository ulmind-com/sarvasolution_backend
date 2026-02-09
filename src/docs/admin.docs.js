/**
 * @swagger
 * tags:
 *   - name: Admin - Users
 *     description: Administrative user management operations (Admin Access Only)
 *   - name: Admin - Payouts
 *     description: Payout request management and processing (Admin Access Only)
 *   - name: Admin - System
 *     description: System management, metrics, and database operations (Admin Access Only)
 * 
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     description: |
 *       **Admin Access Only** - Retrieve a complete list of all registered users in the system.
 *     tags:
 *       - Admin - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 * 
 * /api/v1/admin/users/{memberId}:
 *   get:
 *     summary: Get user details by member ID (Admin only)
 *     description: |
 *       **Admin Access Only** - Retrieve detailed information for a specific user.
 *     tags:
 *       - Admin - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *         example: SVS000001
 *     responses:
 *       200:
 *         description: User details retrieved successfully
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
 *       404:
 *         $ref: '#/components/responses/NotFound'
 * 
 *   patch:
 *     summary: Update any user's details (Admin only)
 *     description: |
 *       **Admin Access Only** - Update any field for a specific user including KYC, bank details, PAN, Aadhar, etc.
 *       
 *       **Admin can update everything:**
 *       - Personal details (fullName, email, phone, username)
 *       - KYC details (status, aadhaarNumber, images)
 *       - Bank account (account name, number, IFSC, branch, bank name)
 *       - PAN card number
 *       - Address, profile picture, rank, status
 *     tags:
 *       - Admin - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *         example: SVS000001
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               rank:
 *                 type: string
 *                 enum: [Associate, Bronze, Silver, Gold, Platinum, Diamond, Blue Diamond, Black Diamond, Royal Diamond, Crown Diamond, Ambassador, Crown Ambassador, SSVPL Legend]
 *                 example: Silver
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *                 example: active
 *               joiningPackage:
 *                 type: number
 *                 example: 500
 *               panCardNumber:
 *                 type: string
 *                 example: "ABCDE1234F"
 *               aadharCardNumber:
 *                 type: string
 *                 example: "123456789012"
 *               bankDetails:
 *                 type: object
 *                 properties:
 *                   accountName: { type: string }
 *                   accountNumber: { type: string }
 *                   bankName: { type: string }
 *                   ifscCode: { type: string }
 *                   branch: { type: string }
 *               kyc:
 *                 type: object
 *                 description: Admin can update all KYC fields
 *                 properties:
 *                   status:
 *                     type: string
 *                     enum: [none, pending, verified, rejected]
 *                     example: verified
 *                   aadhaarNumber:
 *                     type: string
 *                     example: "123456789012"
 *                   aadhaarFront:
 *                     type: object
 *                     properties:
 *                       url: { type: string }
 *                       publicId: { type: string }
 *                   aadhaarBack:
 *                     type: object
 *                     properties:
 *                       url: { type: string }
 *                       publicId: { type: string }
 *                   panImage:
 *                     type: object
 *                     properties:
 *                       url: { type: string }
 *                       publicId: { type: string }
 *                   rejectionReason:
 *                     type: string
 *                     example: "Aadhaar image unclear"
 *               bankDetails:
 *                 type: object
 *                 description: Bank account details (stored in separate BankAccount collection). Admin can create or update all fields.
 *                 properties:
 *                   accountName:
 *                     type: string
 *                     example: "John Doe"
 *                   accountNumber:
 *                     type: string
 *                     example: "1234567890"
 *                   bankName:
 *                     type: string
 *                     example: "HDFC Bank"
 *                   ifscCode:
 *                     type: string
 *                     example: "HDFC0001234"
 *                   branch:
 *                     type: string
 *                     example: "Mumbai Main Branch"
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 * /api/v1/admin/kyc/verify/{memberId}:
 *   patch:
 *     summary: Verify or Reject user KYC (Admin only)
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [verified, rejected]
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: KYC status updated
 * 
 * /api/v1/admin/dashboard-metrics:
 *   get:
 *     summary: Get global system metrics (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics summary fetched
 * 
 * /api/v1/admin/payouts:
 *   get:
 *     summary: Get all payout requests (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pending, completed, rejected, processing]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of payouts retrieved
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
 * 
 * /api/v1/admin/payouts/process:
 *   post:
 *     summary: Verify & Process Payout (Approve/Reject)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [payoutId, status]
 *             properties:
 *               payoutId: { type: string }
 *               status: { type: string, enum: [completed, rejected] }
 *               rejectionReason: { type: string }
 *     responses:
 *       200:
 *         description: Payout processed successfully
 * 
 * /api/v1/admin/bv/allocate-manual:
 *   post:
 *     summary: Manually adjust/allocate BV to a user (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [memberId, bvAmount, leg]
 *             properties:
 *               memberId: { type: string }
 *               bvAmount: { type: number }
 *               leg: { type: string, enum: [left, right, personal] }
 *     responses:
 *       200:
 *         description: BV allocated
 * 
 * */

/**
 * @swagger
 * /api/v1/admin/trigger-bonus:
 *   post:
 *     summary: Manually trigger bonus matching (Admin/Dev only)
 *     description: Forces Fast Track or Star Matching calculation for a specific user. Use carefully.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [memberId, type]
 *             properties:
 *               memberId: { type: string }
 *               type: { type: string, enum: [fast-track, star-match] }
 *     responses:
 *       200:
 *         description: Matching triggered successfully
 * */

/**
 * @swagger
 * /api/v1/admin/transactions:
 *   get:
 *     summary: Audit all BV transactions (Admin only)
 *     tags: [Admin]
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
 *           default: 20
 *       - in: query
 *         name: memberId
 *         schema:
 *           type: string
 *         description: Filter by member ID (e.g., SVS000001)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by transaction type
 *     responses:
 *       200:
 *         description: Transaction log retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                     pagination:
 *                       type: object
 */
