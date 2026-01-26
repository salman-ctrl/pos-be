const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { verifyToken } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

/**
 * @swagger
 * tags:
 *   - name: Customers
 *     description: Manajemen Pelanggan / Member
 */

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Ambil semua pelanggan
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Cari nama, HP, atau ID Member
 *     responses:
 *       200:
 *         description: List pelanggan dengan statistik belanja
 */
router.get('/', verifyToken, customerController.getAllCustomers);

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Tambah pelanggan baru
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               displayType:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Pelanggan berhasil dibuat
 */
router.post(
  '/',
  verifyToken,
  upload.single('image'),
  customerController.createCustomer
);

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: Update data pelanggan
 *     tags: [Customers]
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
 *               phone:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Pelanggan diupdate
 */
router.put(
  '/:id',
  verifyToken,
  upload.single('image'),
  customerController.updateCustomer
);

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     summary: Hapus pelanggan
 *     tags: [Customers]
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
 *         description: Pelanggan dihapus
 */
router.delete(
  '/:id',
  verifyToken,
  customerController.deleteCustomer
);

module.exports = router;
