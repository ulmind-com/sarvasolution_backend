/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management (Admin only creation)
 */

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: Get all active products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 * 
 *   post:
 *     summary: Create a new product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - bv
 *               - price
 *               - segment
 *               - productImage
 *             properties:
 *               name:
 *                 type: string
 *               bv:
 *                 type: number
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *               segment:
 *                 type: string
 *                 enum: [aquaculture, agriculture, personal care, health care, home care, luxury goods]
 *               productImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/Error'
 */
