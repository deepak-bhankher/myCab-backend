const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Owner = require("../models/Owner");
const sendPushNotification = require("../lib/sendPushNotification");

router.post("/", async (req, res) => {
  try {
    const { passengerName, phoneNumber, pickupLocation, dropLocation, fare } =
      req.body;

    const newBooking = new Booking({
      passengerName,
      phoneNumber,
      pickupLocation,
      dropLocation,
      fare,
    });
    await newBooking.save();

    const owner = await Owner.findOne({ expoPushToken: { $ne: null } });
    if (owner && owner.expoPushToken) {
      await sendPushNotification(
        owner.expoPushToken,
        "🚕 New Booking!",
        `${passengerName} | ${pickupLocation} → ${dropLocation}`,
        {
          bookingId: newBooking._id.toString(),
          passengerName,
          phoneNumber,
          pickupLocation,
          dropLocation,
          fare: String(fare),
        }
      );
    }

    res.status(201).json({ message: "Booking Created", booking: newBooking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ bookingDate: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    res.status(200).json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updatedBooking) return res.status(404).json({ error: "Booking not found" });
    res.status(200).json({ message: "Status Updated", booking: updatedBooking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;