const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOTP } = require('../utils/emailService');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "rahasia_super_negara";

exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const imageUrl = req.file ? req.file.path : null;
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ success: false, message: "Email sudah terdaftar!" });

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: { name, email, password: hashedPassword, role: role || 'CASHIER', imageUrl }
        });

        res.status(201).json({ success: true, message: "User berhasil didaftarkan!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.initiateLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(401).json({ success: false, message: "Email atau Password salah!" });

        if (password) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).json({ success: false, message: "Email atau Password salah!" });
        }

        if (!user.isActive) return res.status(403).json({ success: false, message: "Akun non-aktif." });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 1000);

        await prisma.user.update({
            where: { id: user.id },
            data: { otpCode: otp, otpExpiresAt: otpExpires }
        });

        try {
            await sendOTP(email, otp);
        } catch (emailError) {
            console.log(`Log OTP: ${otp}`);
        }

        res.json({ success: true, message: "OTP dikirim ke email Anda.", expiresIn: 10 });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ success: false, message: "User tidak ditemukan" });

        if (user.otpCode !== otp) {
            return res.status(400).json({ success: false, message: "Kode OTP salah!" });
        }

        if (new Date() > new Date(user.otpExpiresAt)) {
            return res.status(400).json({ success: false, message: "Kode OTP kadaluarsa (Basi)." });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

        await prisma.user.update({
            where: { id: user.id },
            data: { otpCode: null, otpExpiresAt: null }
        });

        res.json({
            success: true,
            message: "Login Berhasil",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                imageUrl: user.imageUrl
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.changePassword = async (req, res) => {
};