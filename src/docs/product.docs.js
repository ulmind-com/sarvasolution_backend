/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated MongoDB ID
 *         productName:
 *           type: string
 *           description: Unique name of the product
 *         description:
 *           type: string
 *           description: Detailed description
 *         price:
 *           type: number
 *           description: Selling price
 *         mrp:
 *           type: number
 *           description: Maximum Retail Price
 *         finalPrice:
 *           type: number
 *           description: Price after discount (auto-calculated)
 *         discount:
 *           type: number
 *           description: Discount percentage
 *         bv:
 *           type: number
 *           description: Business Volume
 *         pv:
 *           type: number
 *           description: Point Value
 *         hsnCode:
 *           type: string
 *           description: 6-8 digit HSN Code
 *         batchNo:
 *           type: string
 *           description: Batch number
 *         sku:
 *           type: string
 *           description: Stock Keeping Unit (Unique)
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
 *           description: Virtual field checks if stock > 0
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
 *             required: [productName, description, price, mrp, bv, pv, hsnCode, category, stockQuantity, productImage]
 *             properties:
 *               productName:
 *                 type: string
 *                 example: "Premium Fish Feed"
 *               description:
 *                 type: string
 *                 example: "High quality feed for aquaculture."
 *               price:
 *                 type: number
 *                 example: 2500
 *               mrp:
 *                 type: number
 *                 example: 3000
 *               bv:
 *                 type: number
 *                 example: 1000
 *               pv:
 *                 type: number
 *                 example: 1000
 *               hsnCode:
 *                 type: string
 *                 example: "23099010"
 *               category:
 *                 type: string
 *                 enum: [aquaculture, agriculture, personal care, health care, home care, luxury goods]
 *               stockQuantity:
 *                 type: number
 *                 example: 500
 *               productImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
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
 *         description: Search by name, SKU, or HSN
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: List of products
 */

/**
 * @swagger
 * /api/v1/admin/product/{productId}:
 *   get:
 *     summary: Get product details
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */

/**
 * @swagger
 * /api/v1/admin/product/update/{productId}:
 *   put:
 *     summary: Update product details (and image)
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               productName: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               stockQuantity: { type: number }
 *               productImage: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Product updated successfully
 */

/**
 * @swagger
 * /api/v1/admin/product/approve/{productId}:
 *   patch:
 *     summary: Approve a product for sale
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product approved and activated
 */

/**
 * @swagger
 * /api/v1/admin/product/toggle-status/{productId}:
 *   patch:
 *     summary: Toggle product active status
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Status toggled
 */

/**
 * @swagger
 * /api/v1/admin/product/{productId}:
 *   delete:
 *     summary: Soft delete a product
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product deleted successfully
 */
