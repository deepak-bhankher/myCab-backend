const mongoose = require("mongoose");

const OwnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  fcmToken: {
    type: String,
    default: null,
  },
});

module.exports = mongoose.model("Owner", OwnerSchema);