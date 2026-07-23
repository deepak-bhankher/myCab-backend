const express = require("express");
const router = express.Router();
const Fare = require("../models/Fare");

// Add Fare (ek baar manually daalne ke liye)
router.post("/", async (req, res) => {
  try {
    const { pickupCity, dropCity, price } = req.body;
    const newFare = new Fare({ pickupCity, dropCity, price });
    await newFare.save();
    res.status(201).json({ message: "Fare Added", fare: newFare });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Fare by pickup & drop city
router.get("/", async (req, res) => {
  try {
    const { pickupCity, dropCity } = req.query;
    const fare = await Fare.findOne({ pickupCity, dropCity });
    if (!fare) return res.status(404).json({ message: "Fare not found" });
    res.status(200).json(fare);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get All Fares (list dekhne ke liye)
router.get("/all", async (req, res) => {
  try {
    const fares = await Fare.find();
    res.status(200).json(fares);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;