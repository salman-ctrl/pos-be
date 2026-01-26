const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: Manajemen Pegawai (Admin Only)
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Ambil daftar pegawai
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List pegawai
 */
router.get('/', verifyToken, isAdmin, userController.getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update data pegawai / reset password
 *     tags: [Users]
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
 *               role:
 *                 type: string
 *                 enum: [ADMIN, CASHIER]
 *               password:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: User diupdate
 */
router.put(
  '/:id',
  verifyToken,
  isAdmin,
  upload.single('image'),
  userController.updateUser
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Hapus pegawai
 *     tags: [Users]
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
 *         description: User dihapus
 */
router.delete(
  '/:id',
  verifyToken,
  isAdmin,
  userController.deleteUser
);

module.exports = router;
