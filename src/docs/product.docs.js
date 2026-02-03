/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         productName:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *         mrp:
 *           type: number
 *         finalPrice:
 *           type: number
 *         discount:
 *           type: number
 *         bv:
 *           type: number
 *         pv:
 *           type: number
 *         hsnCode:
 *           type: string
 *         batchNo:
 *           type: string
 *         sku:
 *           type: string
 *         category:
 *           type: string
 *           enum: ['aquaculture', 'agriculture', 'personal care', 'health care', 'home care', 'luxury goods']
 *         productImage:
 *           type: object
 *           properties:
 *             url: { type: string }
 *             publicId: { type: string }
 *         stockQuantity:
 *           type: number
 *         reorderLevel:
 *           type: number
 *         isInStock:
 *           type: boolean
 *         isActive:
 *           type: boolean
 *         isApproved:
 *           type: boolean
 *         isFeatured:
 *           type: boolean
 *         isActivationPackage:
 *           type: boolean
 */

/**
 * @swagger
 * tags:
 *   name: Admin - Products
 *   description: Product Inventory Management (Admin Only)
 */

/**
 * @swagger
 * tags:
 *   name: User - Products
 *   description: Product Browsing & Shopping (User Access)
 */

/**
 * @swagger
 * /api/v1/admin/product/create:
 *   post:
 *     summary: Create a new product
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [productName, description, price, mrp, category, stockQuantity, productImage]
 *             properties:
 *               productName:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               mrp:
 *                 type: number
 *               category:
 *                 type: string
 *                 enum: ['aquaculture', 'agriculture', 'personal care', 'health care', 'home care', 'luxury goods']
 *               stockQuantity:
 *                 type: number
 *               gst:
 *                 type: number
 *               cgst:
 *                 type: number
 *               sgst:
 *                 type: number
 *               hsnCode:
 *                 type: string
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
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Product' }
 *                 message: { type: string }
 */

/**
 * @swagger
 * /api/v1/admin/product/list:
 *   get:
 *     summary: Get all products with pagination & filters
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of products
 */

/**
 * @swagger
 * /api/v1/admin/product/stock/add/{productId}:
 *   patch:
 *     summary: Add stock to inventory
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantityToAdd]
 *             properties:
 *               quantityToAdd: { type: number, min: 1 }
 *     responses:
 *       200:
 *         description: Stock added successfully
 */

/**
 * @swagger
 * /api/v1/admin/product/stock/remove/{productId}:
 *   patch:
 *     summary: Remove stock from inventory
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantityToRemove]
 *             properties:
 *               quantityToRemove: { type: number, min: 1 }
 *     responses:
 *       200:
 *         description: Stock removed successfully
 */


/**
 * @swagger
 * /api/v1/admin/product/stock/history/{productId}:
 *   get:
 *     summary: Get stock transaction history
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *     responses:
 *       200:
 *         description: Stock history fetched
 */

/**
 * @swagger
 * /api/v1/user/products:
 *   get:
 *     summary: Browse products with filtering
 *     tags: [User - Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: Product list fetched
 */

/**
 * @swagger
 * /api/v1/user/products/{productId}:
 *   get:
 *     summary: Get product details
 *     tags: [User - Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *     responses:
 *       200:
 *         description: Product details fetched
 *       404:
 *         description: Product not found
 */
