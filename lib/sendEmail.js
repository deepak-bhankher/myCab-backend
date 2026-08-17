// Uses Brevo's HTTP API (not SMTP) to send emails — this avoids the
// ENETUNREACH / blocked-SMTP-port issues that Render's free tier has with
// traditional SMTP providers like Gmail.

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
const SENDER_NAME = "MyCabExpress";

async function sendOtpEmail(toEmail, otp) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: toEmail }],
      subject: "Your MyCabExpress password reset code",
      htmlContent: `
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
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.log("Brevo email error:", errorData);
    throw new Error("Could not send OTP email");
  }
}

module.exports = { sendOtpEmail };