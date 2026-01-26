const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   - name: Reports
 *     description: Laporan & Analitik Dashboard
 */

/**
 * @swagger
 * /api/reports/dashboard:
 *   get:
 *     summary: Ambil statistik dashboard
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *     responses:
 *       200:
 *         description: Data chart, top product, summary
 */
router.get('/dashboard', verifyToken, reportController.getDashboardStats);

/**
 * @swagger
 * /api/reports/export:
 *   get:
 *     summary: Export laporan transaksi ke CSV
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: File CSV terdownload
 */
router.get(
  '/export',
  verifyToken,
  isAdmin,
  reportController.exportTransactionReport
);

module.exports = router;
