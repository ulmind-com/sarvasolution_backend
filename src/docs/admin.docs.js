/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: Administrative user management
 * 
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags:
 *       - Admin
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
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               panCardNumber:
 *                 type: string
 *               rank:
 *                 type: string
 *               status:
 *                 type: string
 *               joiningPackage:
 *                 type: number
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
 * /api/v1/admin/payouts/process-bulk:
 *   post:
 *     summary: Bulk process pending payouts (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               payoutIds: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Payouts processed
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
 */
