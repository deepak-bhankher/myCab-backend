const express = require("express");
const router = express.Router();
const multer = require("multer");
const Booking = require("../models/Booking");
const Owner = require("../models/Owner");
const { messaging } = require("../config/firebaseAdmin");
const cloudinary = require("../config/cloudinary");

// Files are received in memory (as a buffer), then streamed straight to
// Cloudinary — nothing is ever written to Render's disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed for the ID photo"));
    }
  },
});

// Uploads a file buffer to Cloudinary and resolves with the secure URL.
function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "passenger-ids", resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

router.post("/", upload.single("idPhoto"), async (req, res) => {
  try {
    const {
      passengerName,
      phoneNumber,
      pickupLocation,
      dropLocation,
      fare,
      carType,
      rideDateTime,
      fcmToken,
    } = req.body;

    let idPhotoUrl = null;
    if (req.file) {
      idPhotoUrl = await uploadToCloudinary(req.file.buffer);
    }

    const newBooking = new Booking({
      passengerName,
      phoneNumber,
      pickupLocation,
      dropLocation,
      fare,
      carType,
      rideDateTime,
      idPhotoUrl,
      fcmToken,
    });
    await newBooking.save();

    // ---- Send a real push notification (works even if the app is closed) ----
    const owner = await Owner.findOne({ fcmToken: { $ne: null } });
    if (owner && owner.fcmToken) {
      const rideDateFormatted = new Date(rideDateTime).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const message = {
        token: owner.fcmToken,
        notification: {
          title: "🚕 New Booking!",
          body: `${passengerName} | ${pickupLocation} → ${dropLocation} | ${rideDateFormatted}`,
        },
        data: {
          bookingId: newBooking._id.toString(),
          passengerName,
          phoneNumber,
          pickupLocation,
          dropLocation,
          fare: String(fare),
          carType: newBooking.carType,
          rideDateTime: newBooking.rideDateTime.toISOString(),
          idPhotoUrl: idPhotoUrl || "",
        },
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channelId: "bookings",
          },
        },
      };
      try {
        await messaging.send(message);
        console.log("Push notification sent to owner");
      } catch (notifErr) {
        console.log("Push notification error:", notifErr.message);
      }
    }

    res.status(201).json({ message: "Booking Created", booking: newBooking });
  } catch (error) {
    console.error("BOOKING CREATE ERROR:", error);
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
    const { status, cancelledBy } = req.body;

    const updateFields = { status };
    // Only set cancelledBy when actually cancelling — keeps old data clean
    // for Pending/Completed updates.
    if (status === "Cancelled") {
      updateFields.cancelledBy = cancelledBy || "owner";
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );
    if (!updatedBooking) return res.status(404).json({ error: "Booking not found" });

    // Only notify the owner when the PASSENGER cancels — if the owner
    // themselves changes the status from their app, no notification needed.
    if (status === "Cancelled" && cancelledBy === "passenger") {
      const owner = await Owner.findOne({ fcmToken: { $ne: null } });
      if (owner && owner.fcmToken) {
        const message = {
          token: owner.fcmToken,
          notification: {
            title: "❌ Booking Cancelled",
            body: `${updatedBooking.passengerName} cancelled their ride: ${updatedBooking.pickupLocation} → ${updatedBooking.dropLocation}`,
          },
          data: {
            bookingId: updatedBooking._id.toString(),
            type: "booking_cancelled",
          },
          android: {
            priority: "high",
            notification: { sound: "default", channelId: "bookings" },
          },
        };
        try {
          await messaging.send(message);
          console.log("Cancellation notification sent to owner");
        } catch (notifErr) {
          console.log("Cancellation notification error:", notifErr.message);
        }
      }
    }

    // Notify the PASSENGER whenever the OWNER updates the status
    // (Pending / Completed / Cancelled) — but not when the passenger
    // cancelled it themselves, since they already know.
    const ownerInitiated = !(status === "Cancelled" && cancelledBy === "passenger");
    if (ownerInitiated && updatedBooking.fcmToken) {
      const statusMessages = {
        Pending: { title: "🕐 Booking Pending", body: "Your ride is pending confirmation." },
        Completed: { title: "✅ Ride Completed", body: "Your ride has been marked complete. Thanks for riding with us!" },
        Cancelled: { title: "❌ Booking Cancelled", body: "Your ride has been cancelled by the operator." },
      };
      const content = statusMessages[status];
      console.log("PASSENGER NOTIFY DEBUG — status:", status, "fcmToken present:", !!updatedBooking.fcmToken, "content:", content);
      if (content) {
        const passengerMessage = {
          token: updatedBooking.fcmToken,
          notification: {
            title: content.title,
            body: content.body,
          },
          data: {
            bookingId: updatedBooking._id.toString(),
            type: "status_update",
            status,
          },
          android: {
            priority: "high",
            notification: { sound: "default", channelId: "bookings" },
          },
        };
        try {
          await messaging.send(passengerMessage);
          console.log("Status update notification sent to passenger");
        } catch (notifErr) {
          console.log("Passenger notification error:", notifErr.message);
        }
      }
    }

    res.status(200).json({ message: "Status Updated", booking: updatedBooking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;