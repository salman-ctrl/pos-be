const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const categoryController = require('../controllers/categoryController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

/**
 * @swagger
 * tags:
 *   - name: Products
 *     description: Manajemen Produk & Kategori
 */

/* =======================
   CATEGORY ROUTES
======================= */

/**
 * @swagger
 * /api/products/categories:
 *   get:
 *     summary: Ambil semua kategori
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List kategori
 */
router.get('/categories', verifyToken, categoryController.getAllCategories);

/**
 * @swagger
 * /api/products/categories:
 *   post:
 *     summary: Tambah kategori baru (Admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               displayType:
 *                 type: string
 *                 enum: [normal, wide, tall, large]
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Kategori dibuat
 */
router.post(
  '/categories',
  verifyToken,
  isAdmin,
  upload.single('image'),
  categoryController.createCategory
);

/**
 * @swagger
 * /api/products/categories/{id}:
 *   put:
 *     summary: Edit kategori (Admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               displayType:
 *                 type: string
 *                 enum: [normal, wide, tall, large]
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Kategori diupdate
 */
router.put(
  '/categories/:id',
  verifyToken,
  isAdmin,
  upload.single('image'),
  categoryController.updateCategory
);

/**
 * @swagger
 * /api/products/categories/{id}:
 *   delete:
 *     summary: Hapus kategori (Admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Kategori dihapus
 */
router.delete(
  '/categories/:id',
  verifyToken,
  isAdmin,
  categoryController.deleteCategory
);

/* =======================
   PRODUCT ROUTES
======================= */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Ambil semua produk (Filter & Search)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List produk
 */
router.get('/', verifyToken, productController.getAllProducts);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Tambah produk baru (Admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *             properties:
 *               sku:
 *                 type: string
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               costPrice:
 *                 type: number
 *               stock:
 *                 type: integer
 *               categoryId:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *               displayType:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Produk berhasil dibuat
 */
router.post(
  '/',
  verifyToken,
  isAdmin,
  upload.single('image'),
  productController.createProduct
);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update produk (Admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Produk diupdate
 */
router.put(
  '/:id',
  verifyToken,
  isAdmin,
  upload.single('image'),
  productController.updateProduct
);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Hapus / Non-aktifkan produk (Admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Produk dinonaktifkan
 */
router.delete(
  '/:id',
  verifyToken,
  isAdmin,
  productController.deleteProduct
);

module.exports = router;
