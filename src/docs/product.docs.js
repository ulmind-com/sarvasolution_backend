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
 *           enum: [aquaculture, agriculture, personal care, health care, home care, luxury goods]
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
 *
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
 *           // ... (Same as before)
 *     responses:
 *       201:
 *         description: Product created successfully
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
 *             required: [quantityToAdd, reason]
 *             properties:
 *               quantityToAdd: { type: number, min: 1 }
 *               reason: { type: string, minLength: 5 }
 *               batchNo: { type: string }
 *               referenceNo: { type: string }
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
 *             required: [quantityToRemove, reason]
 *             properties:
 *               quantityToRemove: { type: number, min: 1 }
 *               reason: { type: string, minLength: 5 }
 *               referenceNo: { type: string }
 *     responses:
 *       200:
 *         description: Stock removed successfully
 */

/**
 * @swagger
 * /api/v1/admin/product/alerts/low-stock:
 *   get:
 *     summary: Get low stock alerts
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of products with low stock
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

// ... (Other endpoints kept for brevity, will rewrite completely in real file)
