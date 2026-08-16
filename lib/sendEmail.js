const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendOtpEmail(toEmail, otp) {
  await transporter.sendMail({
    from: `"MyCabExpress" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your MyCabExpress password reset code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 420px; margin: auto; padding: 24px;">
        <h2 style="color:#000428; margin-bottom: 8px;">Reset your password</h2>
        <p style="color:#4A505C; font-size: 14px;">
          Use the code below to reset your MyCabExpress password. This code expires in 10 minutes.
        </p>
        <div style="background:#F5F7FA; border-radius:12px; padding:20px; text-align:center; margin:20px 0;">
          <span style="font-size:32px; font-weight:800; letter-spacing:8px; color:#004e92;">${otp}</span>
        </div>
        <p style="color:#8A8F99; font-size:12px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

module.exports = { sendOtpEmail };