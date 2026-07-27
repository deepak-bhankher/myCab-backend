const express = require("express");
const router = express.Router();
const Owner = require("../models/Owner");

router.post("/register", async (req, res) => {
  try {
    const { name, mobileNumber, password } = req.body;
    const newOwner = new Owner({ name, mobileNumber, password });
    await newOwner.save();
    res.status(201).json({ message: "Owner Registered", owner: newOwner });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { mobileNumber, password } = req.body;
    const owner = await Owner.findOne({ mobileNumber, password });
    if (!owner) return res.status(401).json({ message: "Invalid mobile number or password" });
    res.status(200).json({ message: "Login Success", owner });
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
    res.status(200).json({ message: "FCM token saved", owner });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;