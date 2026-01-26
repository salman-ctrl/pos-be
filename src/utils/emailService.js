const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

exports.sendOTP = async (email, otp) => {
  const mailOptions = {
    from: `"Savoria Security" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Kode Verifikasi Masuk - Savoria POS',
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #f97316;">Verifikasi Login</h2>
        <p>Halo,</p>
        <p>Gunakan kode berikut untuk masuk ke sistem Savoria POS:</p>
        <h1 style="font-size: 32px; letter-spacing: 5px; color: #333;">${otp}</h1>
        <p>Kode ini berlaku selama 5 menit. Jangan berikan kode ini kepada siapapun.</p>
        <hr/>
        <p style="font-size: 12px; color: #888;">Jika Anda tidak merasa melakukan login, abaikan email ini.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};