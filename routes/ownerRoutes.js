const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Owner = require("../models/Owner");
const SignupVerification = require("../models/SignupVerification");
const {
  sendOtpEmail,
  sendSignupOtpEmail,
  sendOwnerLoginAlertEmail,
  sendOwnerLogoutAlertEmail,
} = require("../lib/sendEmail");

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ---------------------------------------------------------------------------
// 1. Send Signup OTP for Owner
// ---------------------------------------------------------------------------
router.post("/send-signup-otp", async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await Owner.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "An owner account with this email already exists" });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await SignupVerification.findOneAndUpdate(
      { email: normalizedEmail },
      { otp, expiresAt },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await sendSignupOtpEmail(normalizedEmail, otp, name);

    res.status(200).json({ message: "Verification code sent to your email" });
  } catch (error) {
    console.error("Owner send-signup-otp error:", error);
    res.status(500).json({ message: error.message || "Failed to send verification code" });
  }
});

// ---------------------------------------------------------------------------
// 2. Register Owner (with OTP verification)
// ---------------------------------------------------------------------------
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (!otp) {
      return res.status(400).json({ message: "Verification code (OTP) is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await Owner.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "An owner account with this email already exists" });
    }

    const verification = await SignupVerification.findOne({ email: normalizedEmail });
    if (!verification || new Date() > verification.expiresAt) {
      return res.status(400).json({ message: "Verification code has expired. Please request a new code." });
    }

    if (verification.otp !== String(otp).trim()) {
      return res.status(400).json({ message: "Incorrect verification code. Please check and try again." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newOwner = new Owner({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });
    await newOwner.save();

    await SignupVerification.deleteOne({ email: normalizedEmail });

    const ownerResponse = newOwner.toObject();
    delete ownerResponse.password;
    delete ownerResponse.resetOtp;
    delete ownerResponse.resetOtpExpiry;

    res.status(201).json({ message: "Owner Registered", owner: ownerResponse });
  } catch (error) {
    console.error("Owner register error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ---------------------------------------------------------------------------
// 3. Login Owner (accepts email or mobileNumber)
// ---------------------------------------------------------------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password, mobileNumber } = req.body;
    const identifier = (email || mobileNumber || "").trim();

    if (!identifier || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = identifier.toLowerCase();
    const owner = await Owner.findOne({
      $or: [{ email: normalizedEmail }, { mobileNumber: identifier }],
    });

    if (!owner) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, owner.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const ownerResponse = owner.toObject();
    delete ownerResponse.password;
    delete ownerResponse.resetOtp;
    delete ownerResponse.resetOtpExpiry;

    // Dispatch login security email alert to owner asynchronously
    if (owner.email) {
      sendOwnerLoginAlertEmail(owner.email, owner.name).catch((err) =>
        console.error("Failed to send owner login alert email:", err)
      );
    }

    res.status(200).json({ message: "Login Success", owner: ownerResponse });
  } catch (error) {
    console.error("Owner login error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ---------------------------------------------------------------------------
// 3b. Logout Owner — dispatches logout security alert email and clears FCM push notification token
// ---------------------------------------------------------------------------
router.post("/logout", async (req, res) => {
  try {
    const { email } = req.body;
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      // Clear fcmToken so logged-out owner does NOT receive any push notifications
      const owner = await Owner.findOneAndUpdate(
        { email: normalizedEmail },
        { $set: { fcmToken: null } },
        { new: true }
      );
      sendOwnerLogoutAlertEmail(normalizedEmail, owner?.name || "").catch((err) =>
        console.error("Failed to send owner logout alert email:", err)
      );
    }
    res.status(200).json({ message: "Logged out successfully and notifications disabled" });
  } catch (error) {
    console.error("Owner logout error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ---------------------------------------------------------------------------
// 4. Forgot Password for Owner — sends OTP to owner email
// ---------------------------------------------------------------------------
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const owner = await Owner.findOne({ email: normalizedEmail });

    if (!owner) {
      return res.status(404).json({ message: "No owner account found with this email" });
    }

    const otp = generateOtp();
    owner.resetOtp = otp;
    owner.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await owner.save();

    await sendOtpEmail(owner.email, otp);

    res.status(200).json({ message: "Reset code sent to your email" });
  } catch (error) {
    console.error("Owner forgot-password error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ---------------------------------------------------------------------------
// 5. Reset Password for Owner — verify OTP and update password
// ---------------------------------------------------------------------------
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP and new password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const owner = await Owner.findOne({ email: normalizedEmail });

    if (!owner || !owner.resetOtp || !owner.resetOtpExpiry) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (owner.resetOtp !== String(otp).trim()) {
      return res.status(400).json({ message: "Incorrect OTP. Please try again." });
    }

    if (new Date() > owner.resetOtpExpiry) {
      return res.status(400).json({ message: "OTP has expired. Please request a new code." });
    }

    owner.password = await bcrypt.hash(newPassword, 10);
    owner.resetOtp = undefined;
    owner.resetOtpExpiry = undefined;
    await owner.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Owner reset-password error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ---------------------------------------------------------------------------
// 6. Save FCM Token
// ---------------------------------------------------------------------------
router.put("/save-token", async (req, res) => {
  try {
    const { email, mobileNumber, fcmToken } = req.body;
    const identifier = (email || mobileNumber || "").trim();

    if (!identifier) {
      return res.status(400).json({ message: "Email or mobile number is required" });
    }

    const owner = await Owner.findOneAndUpdate(
      {
        $or: [
          { email: identifier.toLowerCase() },
          { mobileNumber: identifier },
        ],
      },
      { fcmToken },
      { new: true }
    );
    if (!owner) return res.status(404).json({ message: "Owner not found" });

    const ownerResponse = owner.toObject();
    delete ownerResponse.password;
    delete ownerResponse.resetOtp;
    delete ownerResponse.resetOtpExpiry;

    res.status(200).json({ message: "FCM token saved", owner: ownerResponse });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;