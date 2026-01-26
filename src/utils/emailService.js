const nodemailer = require('nodemailer');

/**
 * KONFIGURASI BREVO SMTP
 * Kita menggunakan port 587 (TLS) karena paling aman untuk lingkungan Render.
 */
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // Wajib false untuk port 587
  auth: {
    // Gunakan 'Login' yang ada di dashboard Brevo kamu
    user: process.env.SMTP_USER, 
    // Gunakan SMTP Key panjang yang kamu kirim tadi
    pass: process.env.SMTP_PASS, 
  },
});

exports.sendOTP = async (email, otp) => {
  const mailOptions = {
    // PENTING: Email pengirim (from) sebaiknya sama dengan SMTP_USER 
    // atau email yang sudah kamu verifikasi di Brevo.
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
    console.log(`✅ OTP Terkirim via Brevo: ${info.response}`);
    return true;
  } catch (error) {
    console.error("❌ Detail Error Brevo:", error.message);
    throw new Error("Gagal mengirim email verifikasi.");
  }
};