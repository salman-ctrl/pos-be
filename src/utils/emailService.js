const nodemailer = require('nodemailer');

/**
 * KONFIGURASI BREVO SMTP
 * Menggunakan port 2525 karena port 587 sering diblokir di Render
 */
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 2525, // ⬅️ UBAH INI dari 587 ke 2525
  secure: false,
  auth: {
    user: process.env.SMTP_USER, 
    pass: process.env.SMTP_PASS, 
  },
  // Tambahan untuk debugging & timeout handling
  connectionTimeout: 10000, // 10 detik
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

// Verifikasi koneksi saat startup
transporter.verify(function(error, success) {
  if (error) {
    console.error('❌ SMTP Connection Failed:', error.message);
  } else {
    console.log('✅ SMTP Server siap mengirim email');
  }
});

exports.sendOTP = async (email, otp) => {
  const mailOptions = {
    from: `"Savoria POS System" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `[${otp}] Kode Verifikasi Masuk`,
    html: `
      <div style="font-family: sans-serif; padding: 30px; border: 1px solid #eee; border-radius: 20px; max-width: 500px; margin: auto; text-align: center;">
        <h2 style="color: #f97316;">Verifikasi Login</h2>
        <p>Gunakan kode di bawah ini untuk mengakses sistem POS Savoria Anda:</p>
        <div style="background: #fff7ed; padding: 20px; border-radius: 15px; border: 1px dashed #fdba74; margin: 20px 0;">
            <h1 style="font-size: 40px; letter-spacing: 10px; color: #111; margin: 0; font-family: monospace;">${otp}</h1>
        </div>
        <p style="font-size: 12px; color: #666;">Kode ini berlaku selama 5 menit. Jangan berikan kode ini kepada siapa pun.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 10px; color: #999;">&copy; 2026 Savoria POS - Automated Security</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP Terkirim via Brevo: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("❌ Detail Error Brevo:", error.message);
    console.error("❌ Full Error:", error);
    throw new Error("Gagal mengirim email verifikasi.");
  }
};
