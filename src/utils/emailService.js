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

transporter.verify(function (error, success) {
  if (error) {
    console.error('❌ SMTP Connection Failed:', error.message);
  } else {
    console.log('✅ SMTP Server siap mengirim email premium');
  }
});

exports.sendOTP = async (email, otp) => {
  const mailOptions = {
    from: '"Savoria POS" <zirmanvictory@gmail.com>',
    to: email,
    subject: `${otp} - Autentikasi Keamanan Savoria`,
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; border-collapse: collapse; border: 1px solid #f0f0f0; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.03);">
                
                <tr>
                  <td style="background-color: #000000; padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 4px; font-weight: 900; text-transform: uppercase;">SAVORIA</h1>
                    <p style="color: #f97316; margin: 5px 0 0 0; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">Enterprise Security</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 50px 40px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 40px;">
                      <h2 style="color: #111111; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Verifikasi Identitas</h2>
                      <p style="color: #666666; font-size: 14px; margin-top: 10px; line-height: 1.5;">Gunakan kode otentikasi di bawah ini untuk mengakses dashboard Savoria POS Anda.</p>
                    </div>

                    <div style="background-color: #f9fafb; border-radius: 20px; padding: 40px 20px; text-align: center; border: 1px solid #f3f4f6;">
                      <span style="display: block; font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 15px;">KODE OTP ANDA</span>
                      <h1 style="font-size: 56px; font-weight: 900; color: #111111; margin: 0; letter-spacing: 12px; font-family: 'Courier New', Courier, monospace;">${otp}</h1>
                    </div>

                    <div style="margin-top: 40px; text-align: center;">
                       <p style="color: #ef4444; font-size: 11px; margin: 0; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
                         ⚠️ Berlaku sangat singkat: 10 Detik
                       </p>
                       <p style="color: #999999; font-size: 11px; margin: 8px 0 0 0; font-style: italic;">
                         Jangan bagikan kode ini kepada siapapun demi keamanan data Anda.
                       </p>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 30px 40px; background-color: #fafafa; border-top: 1px solid #f3f4f6; text-align: center;">
                    <p style="color: #9ca3af; font-size: 11px; margin: 0; line-height: 1.6;">
                      &copy; 2026 Savoria Bistro System. All Rights Reserved.<br/>
                      Email ini dikirim secara otomatis oleh sistem keamanan internal.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </div>
    `,
    headers: {
      'X-Priority': '1',
      'Importance': 'high'
    }
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP Premium sent to: ${email} (Message ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error("❌ Error mengirim email:", error.message);
    throw new Error("Gagal mengirim email verifikasi.");
  }
};