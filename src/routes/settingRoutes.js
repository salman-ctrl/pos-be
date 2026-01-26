const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

/**
 * @swagger
 * tags:
 *   - name: Settings
 *     description: Konfigurasi Toko (Profil, Pajak, Logo)
 */

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Ambil pengaturan toko
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data pengaturan
 */
router.get('/', verifyToken, settingController.getSettings);

/**
 * @swagger
 * /api/settings:
 *   put:
 *     summary: Update pengaturan toko (Admin)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               storeName:
 *                 type: string
 *               taxRate:
 *                 type: number
 *               enableQris:
 *                 type: boolean
 *               logo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Pengaturan disimpan
 */
router.put(
  '/',
  verifyToken,
  isAdmin,
  upload.single('logo'),
  settingController.updateSettings
);

module.exports = router;
