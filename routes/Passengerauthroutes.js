const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Passenger = require("../models/Passenger");
const SignupVerification = require("../models/SignupVerification");
const {
  sendOtpEmail,
  sendSignupOtpEmail,
  sendLoginAlertEmail,
  sendLogoutAlertEmail,
} = require("../lib/sendEmail");

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit code
}

// ---------------------------------------------------------------------------
// Send Signup OTP
// ---------------------------------------------------------------------------
router.post("/send-signup-otp", async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await Passenger.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
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
    console.error("send-signup-otp error:", error);
    res.status(500).json({ message: error.message || "Failed to send verification code" });
  }
});

// ---------------------------------------------------------------------------
// Register (with OTP verification)
// ---------------------------------------------------------------------------
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, otp } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (!otp) {
      return res.status(400).json({ message: "Verification code (OTP) is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await Passenger.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const verification = await SignupVerification.findOne({ email: normalizedEmail });
    if (!verification || new Date() > verification.expiresAt) {
      return res.status(400).json({ message: "Verification code has expired. Please request a new code." });
    }

    if (verification.otp !== String(otp).trim()) {
      return res.status(400).json({ message: "Incorrect verification code. Please check and try again." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const passenger = new Passenger({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone ? phone.trim() : "",
    });
    await passenger.save();

    // Remove the verification record now that account is created
    await SignupVerification.deleteOne({ email: normalizedEmail });

    const response = passenger.toObject();
    delete response.password;
    delete response.resetOtp;
    delete response.resetOtpExpiry;

    res.status(201).json({ message: "Account created", passenger: response });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const passenger = await Passenger.findOne({ email: email?.toLowerCase().trim() });
    if (!passenger) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, passenger.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const response = passenger.toObject();
    delete response.password;
    delete response.resetOtp;
    delete response.resetOtpExpiry;

    // Send login alert email asynchronously (non-blocking)
    sendLoginAlertEmail(passenger.email, passenger.name).catch((err) =>
      console.error("Failed to send login alert email:", err)
    );

    res.status(200).json({ message: "Login successful", passenger: response });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
router.post("/logout", async (req, res) => {
  try {
    const { email } = req.body;
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const passenger = await Passenger.findOne({ email: normalizedEmail });
      sendLogoutAlertEmail(normalizedEmail, passenger?.name || "").catch((err) =>
        console.error("Failed to send logout alert email:", err)
      );
    }
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------------------------------------------------------------------------
// Forgot Password — generates a 6-digit OTP, emails it, valid for 10 minutes
// ---------------------------------------------------------------------------
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const passenger = await Passenger.findOne({ email: email?.toLowerCase().trim() });

    // Same response whether or not the email exists — don't leak account info
    if (!passenger) {
      return res.status(200).json({ message: "If this email exists, an OTP has been sent" });
    }

    const otp = generateOtp();
    passenger.resetOtp = otp;
    passenger.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await passenger.save();

    await sendOtpEmail(passenger.email, otp);

    res.status(200).json({ message: "If this email exists, an OTP has been sent" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------------------------------------------------------------------------
// Reset Password — verify OTP, set new password
// ---------------------------------------------------------------------------
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const passenger = await Passenger.findOne({ email: email?.toLowerCase().trim() });

    if (!passenger || !passenger.resetOtp || !passenger.resetOtpExpiry) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    if (passenger.resetOtp !== otp) {
      return res.status(400).json({ message: "Incorrect OTP" });
    }
    if (new Date() > passenger.resetOtpExpiry) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    passenger.password = await bcrypt.hash(newPassword, 10);
    passenger.resetOtp = undefined;
    passenger.resetOtpExpiry = undefined;
    await passenger.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------------------------------------------------------------------------
// Update Profile (Name, Phone)
// ---------------------------------------------------------------------------
router.put("/profile", async (req, res) => {
  try {
    const { email, name, phone } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const passenger = await Passenger.findOne({ email: email.toLowerCase().trim() });
    if (!passenger) {
      return res.status(404).json({ message: "Passenger not found" });
    }

    if (name && name.trim()) passenger.name = name.trim();
    if (phone !== undefined) passenger.phone = phone.trim();

    await passenger.save();

    const response = passenger.toObject();
    delete response.password;
    delete response.resetOtp;
    delete response.resetOtpExpiry;

    res.status(200).json({ message: "Profile updated successfully", passenger: response });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;