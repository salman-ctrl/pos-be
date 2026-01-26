const nodemailer = require('nodemailer');

// Helper: Render butuh port 465 (SSL) agar tidak timeout
const smtpPort = parseInt(process.env.SMTP_PORT) || 465;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: smtpPort,
  secure: true, // WAJIB true untuk port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // Pastikan di Render tidak ada spasi
  },
  // Setting tambahan agar koneksi lebih stabil di Cloud
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 15000, // Tambah waktu tunggu ke 15 detik
});

exports.sendOTP = async (email, otp) => {
  const mailOptions = {
    from: `"Savoria POS Security" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Kode Verifikasi Masuk - Savoria POS',
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #eee; padding: 25px; border-radius: 20px;">
        <h2 style="color: #f97316; text-align: center;">Verifikasi Login</h2>
        <p>Halo,</p>
        <p>Gunakan kode verifikasi di bawah ini untuk masuk ke dashboard POS Anda:</p>
        <div style="background: #fff7ed; padding: 20px; text-align: center; border-radius: 15px; margin: 25px 0; border: 1px dashed #fdba74;">
            <h1 style="font-size: 45px; letter-spacing: 12px; color: #c2410c; margin: 0; font-family: monospace;">${otp}</h1>
        </div>
        <p style="font-size: 13px; color: #666; line-height: 1.5;">
          Kode ini berlaku selama <b>5 menit</b>. Jika Anda tidak merasa melakukan permintaan ini, silakan abaikan email ini.
        </p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
        <p style="font-size: 11px; color: #999; text-align: center;">&copy; 2026 Savoria POS System - Security Service</p>
      </div>
    `,
  };

  try {
    // Verifikasi koneksi sebelum kirim
    await transporter.verify();
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP Berhasil dikirim ke: ${email}`);
  } catch (error) {
    console.error("❌ Nodemailer Error:", error.message);
    // Jika masih timeout, kemungkinan IP Render diblokir Gmail atau kredensial salah
    throw new Error("Gagal mengirim email verifikasi. Cek logs server.");
  }
};