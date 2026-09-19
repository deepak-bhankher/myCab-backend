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

async function sendSignupOtpEmail(toEmail, otp, name = "") {
  const greeting = name && name.trim() ? `Hello ${name.trim()},` : "Hello,";

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
      subject: "Verify your email - MyCabExpress",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 440px; margin: auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 16px;">
          <div style="text-align:center; margin-bottom: 20px;">
            <h2 style="color:#000428; margin: 0 0 6px 0; font-size: 22px; font-weight: 800;">Welcome to MyCabExpress</h2>
            <p style="color:#64748B; font-size: 13px; margin: 0;">Safe, upfront fares & reliable cabs across your city</p>
          </div>
          <p style="color:#334155; font-size: 15px; margin-bottom: 12px;">
            ${greeting}
          </p>
          <p style="color:#4A505C; font-size: 14px; line-height: 20px;">
            Thank you for creating an account. Please use the verification code below to complete your registration. This code is valid for <strong>10 minutes</strong>.
          </p>
          <div style="background:#F0F4F8; border-radius:12px; padding:20px; text-align:center; margin:22px 0; border: 1px dashed #004e92;">
            <span style="font-size:34px; font-weight:900; letter-spacing:8px; color:#004e92;">${otp}</span>
          </div>
          <p style="color:#8A8F99; font-size:12px; line-height: 18px;">
            If you did not sign up for a MyCabExpress account, please ignore this email.
          </p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.log("Brevo signup email error:", errorData);
    throw new Error("Could not send verification email");
  }
}

module.exports = { sendOtpEmail, sendSignupOtpEmail };