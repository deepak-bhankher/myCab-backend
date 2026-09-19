const mongoose = require("mongoose");

const OwnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      sparse: true,
    },
    mobileNumber: {
      type: String,
      required: false,
      default: null,
    },
    password: {
      type: String,
      required: true,
    },
    fcmToken: {
      type: String,
      default: null,
    },
    resetOtp: {
      type: String,
      default: null,
    },
    resetOtpExpiry: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Owner", OwnerSchema);