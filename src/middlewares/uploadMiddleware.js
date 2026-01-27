const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary'); // Pastikan file config ini sudah benar

/**
 * PENTING:
 * Kode sebelumnya menggunakan diskStorage (Lokal), 
 * sekarang kita ganti ke CloudinaryStorage agar foto tersimpan permanen di Cloud.
 */
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'pos-savoria-uploads', // Nama folder di dashboard Cloudinary Anda
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        // Mentransformasi gambar agar ukurannya tidak terlalu raksasa (opsional)
        transformation: [{ width: 800, height: 800, crop: 'limit' }],
    },
});

// Filter file untuk memastikan hanya gambar yang boleh diupload
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Hanya boleh upload file gambar (jpg, png, jpeg, webp)!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 3 * 1024 * 1024 }, // Limit 3MB
    fileFilter: fileFilter
});

module.exports = upload;