const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        imageUrl: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password, isActive } = req.body;

    const dataToUpdate = {};

    if (name) dataToUpdate.name = name;
    if (email) dataToUpdate.email = email;
    if (role) dataToUpdate.role = role;

    if (isActive !== undefined) {
      dataToUpdate.isActive = isActive === 'true' || isActive === true;
    }

    if (password && password.trim() !== "") {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    // FIX: Cloudinary Photo Profile
    if (req.file) {
      dataToUpdate.imageUrl = req.file.path;
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: dataToUpdate
    });

    res.json({ success: true, message: "Data pengguna diperbarui", data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ success: false, message: "Tidak bisa menghapus akun sendiri!" });
    }

    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ success: true, message: "Pengguna berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};