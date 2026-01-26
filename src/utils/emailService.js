const nodemailer = require('nodemailer');

/**
 * PENTING UNTUK RENDER:
 * Menggunakan preset service: 'gmail' jauh lebih stabil daripada konfigurasi host/port manual
 * karena Nodemailer akan menangani pemilihan port (biasanya 587 dengan STARTTLS) 
 * yang lebih ramah terhadap jaringan cloud.
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // Pastikan di Render tetap tanpa spasi
  },
  tls: {
    // Membantu melewati kendala sertifikat di lingkungan container/proxy
    rejectUnauthorized: false
  },
  connectionTimeout: 20000, // Menunggu koneksi hingga 20 detik
  greetingTimeout: 20000,   // Menunggu respon server hingga 20 detik
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
    // Verifikasi koneksi sebelum mencoba mengirim
    console.log("Menghubungkan ke server email...");
    await transporter.verify();
    
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP Berhasil dikirim ke: ${email}`);
  } catch (error) {
    console.error("❌ Nodemailer Error:", error.message);
    
    // Memberikan instruksi lebih spesifik jika terjadi error
    if (error.code === 'ETIMEDOUT') {
        throw new Error("Koneksi ke Gmail timeout. Server Render sedang kesulitan menjangkau Google.");
    } else if (error.message.includes('Invalid login')) {
        throw new Error("Email atau App Password salah. Periksa variabel SMTP_USER/PASS.");
    }
    
    throw new Error("Gagal mengirim email verifikasi. Cek logs server.");
  }
};