const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Owner = require("../models/Owner");

router.post("/register", async (req, res) => {
  try {
    const { name, mobileNumber, password } = req.body;

    // Check if an account already exists for this number
    const existing = await Owner.findOne({ mobileNumber });
    if (existing) {
      return res.status(409).json({ message: "An account with this number already exists" });
    }

    // Hash the password before saving — never store plain text
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newOwner = new Owner({ name, mobileNumber, password: hashedPassword });
    await newOwner.save();

    // Don't send the password hash back in the response
    const ownerResponse = newOwner.toObject();
    delete ownerResponse.password;

    res.status(201).json({ message: "Owner Registered", owner: ownerResponse });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { mobileNumber, password } = req.body;

    const owner = await Owner.findOne({ mobileNumber });
    if (!owner) {
      return res.status(401).json({ message: "Invalid mobile number or password" });
    }

    const isMatch = await bcrypt.compare(password, owner.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid mobile number or password" });
    }

    const ownerResponse = owner.toObject();
    delete ownerResponse.password;

    res.status(200).json({ message: "Login Success", owner: ownerResponse });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Save/update this owner's FCM token — the app calls this after login
router.put("/save-token", async (req, res) => {
  try {
    const { mobileNumber, fcmToken } = req.body;
    const owner = await Owner.findOneAndUpdate(
      { mobileNumber },
      { fcmToken },
      { new: true }
    );
    if (!owner) return res.status(404).json({ message: "Owner not found" });

    const ownerResponse = owner.toObject();
    delete ownerResponse.password;

    res.status(200).json({ message: "FCM token saved", owner: ownerResponse });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;