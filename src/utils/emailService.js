const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 2525,
  secure: false,
  auth: {
    user: process.env.SMTP_USER, 
    pass: process.env.SMTP_PASS, 
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

transporter.verify(function(error, success) {
  if (error) {
    console.error('❌ SMTP Connection Failed:', error.message);
  } else {
    console.log('✅ SMTP Server siap mengirim email');
  }
});

exports.sendOTP = async (email, otp) => {
  const mailOptions = {
    from: '"Savoria POS" <zirmanvictory@gmail.com>', // ⬅️ EMAIL VERIFIED KAMU
    to: email,
    subject: `${otp} - Kode Verifikasi Login`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #f97316; text-align: center; margin-bottom: 20px;">🔐 Kode Verifikasi Login</h2>
          <p style="color: #333; font-size: 16px; text-align: center;">Gunakan kode OTP di bawah untuk login ke Savoria POS:</p>
          
          <div style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); padding: 25px; border-radius: 10px; margin: 25px 0; text-align: center; border: 2px dashed #fdba74;">
            <h1 style="font-size: 48px; letter-spacing: 8px; color: #111; margin: 0; font-family: 'Courier New', monospace;">${otp}</h1>
          </div>
          
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">⏱️ Kode ini berlaku selama <strong>5 menit</strong></p>
          </div>
          
          <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b; font-size: 14px;">🚫 Jangan bagikan kode ini kepada siapa pun!</p>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
          
          <p style="text-align: center; color: #6b7280; font-size: 12px; margin: 0;">
            Email otomatis dari <strong>Savoria POS System</strong><br/>
            © 2026 - Jangan balas email ini
          </p>
        </div>
      </div>
    `,
    headers: {
      'X-Priority': '1',
      'Importance': 'high'
    }
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP berhasil dikirim ke: ${email}`);
    console.log(`📧 Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("❌ Error mengirim email:", error.message);
    throw new Error("Gagal mengirim email verifikasi.");
  }
};