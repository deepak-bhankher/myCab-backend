const mongoose = require("mongoose");

const SignupVerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Automatically deleted by MongoDB TTL when expiresAt is reached
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SignupVerification", SignupVerificationSchema);
