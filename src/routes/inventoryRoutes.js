const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   - name: Inventory
 *     description: Manajemen Stok & Log
 */

/**
 * @swagger
 * /api/inventory/history:
 *   get:
 *     summary: Lihat riwayat keluar masuk barang
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Log stok
 */
router.get('/history', verifyToken, inventoryController.getStockHistory);

/**
 * @swagger
 * /api/inventory/adjustment:
 *   post:
 *     summary: Stock Opname (Penyesuaian Manual)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - type
 *               - qty
 *             properties:
 *               productId:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [IN, OUT]
 *               qty:
 *                 type: integer
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stok berhasil disesuaikan
 */
router.post(
  '/adjustment',
  verifyToken,
  isAdmin,
  inventoryController.stockAdjustment
);

module.exports = router;
