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

function getFormattedDateTime() {
  return new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

async function sendLoginAlertEmail(toEmail, name = "") {
  const greeting = name && name.trim() ? `Hello ${name.trim()},` : "Hello,";
  const loginTime = getFormattedDateTime();

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
      subject: "Security Alert: Login to your MyCabExpress account",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 440px; margin: auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 16px;">
          <div style="text-align:center; margin-bottom: 20px;">
            <h2 style="color:#000428; margin: 0 0 6px 0; font-size: 22px; font-weight: 800;">MyCabExpress</h2>
            <p style="color:#64748B; font-size: 13px; margin: 0;">Account Activity Alert</p>
          </div>
          <p style="color:#334155; font-size: 15px; margin-bottom: 12px;">
            ${greeting}
          </p>
          <p style="color:#4A505C; font-size: 14px; line-height: 20px;">
            Your MyCabExpress passenger account was just logged in.
          </p>
          <div style="background:#F0FDF4; border: 1px solid #BBF7D0; border-radius:12px; padding:16px; margin:18px 0;">
            <p style="margin:0 0 6px 0; font-size:13px; color:#166534;"><strong>Time:</strong> ${loginTime} (IST)</p>
            <p style="margin:0; font-size:13px; color:#166534;"><strong>Device:</strong> MyCabExpress Android Passenger App</p>
          </div>
          <p style="color:#4A505C; font-size:13px; line-height: 18px;">
            If this was you, no action is needed. If you did not log in, please reset your password immediately in the app to secure your account.
          </p>
          <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0 12px 0;" />
          <p style="color:#94A3B8; font-size:11px; margin:0; text-align:center;">
            MyCabExpress · Safe, Reliable Cabs & Upfront Fares
          </p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.log("Brevo login alert error:", errorData);
  }
}

async function sendLogoutAlertEmail(toEmail, name = "") {
  const greeting = name && name.trim() ? `Hello ${name.trim()},` : "Hello,";
  const logoutTime = getFormattedDateTime();

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
      subject: "Security Alert: Logged out from your MyCabExpress account",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 440px; margin: auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 16px;">
          <div style="text-align:center; margin-bottom: 20px;">
            <h2 style="color:#000428; margin: 0 0 6px 0; font-size: 22px; font-weight: 800;">MyCabExpress</h2>
            <p style="color:#64748B; font-size: 13px; margin: 0;">Account Activity Alert</p>
          </div>
          <p style="color:#334155; font-size: 15px; margin-bottom: 12px;">
            ${greeting}
          </p>
          <p style="color:#4A505C; font-size: 14px; line-height: 20px;">
            You have been successfully logged out from the MyCabExpress Passenger App.
          </p>
          <div style="background:#F1F5F9; border: 1px solid #E2E8F0; border-radius:12px; padding:16px; margin:18px 0;">
            <p style="margin:0 0 6px 0; font-size:13px; color:#334155;"><strong>Time:</strong> ${logoutTime} (IST)</p>
            <p style="margin:0; font-size:13px; color:#334155;"><strong>Status:</strong> Session ended</p>
          </div>
          <p style="color:#4A505C; font-size:13px; line-height: 18px;">
            You can log back in anytime using your registered email and password.
          </p>
          <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0 12px 0;" />
          <p style="color:#94A3B8; font-size:11px; margin:0; text-align:center;">
            MyCabExpress · Safe, Reliable Cabs & Upfront Fares
          </p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.log("Brevo logout alert error:", errorData);
  }
}

module.exports = {
  sendOtpEmail,
  sendSignupOtpEmail,
  sendLoginAlertEmail,
  sendLogoutAlertEmail,
};