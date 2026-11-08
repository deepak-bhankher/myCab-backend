const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const bookingRoutes = require("./routes/bookingRoutes");
const fareRoutes = require("./routes/fareRoutes");
const ownerRoutes = require("./routes/ownerRoutes");

const app = express();

// middleware
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("mongoDB error", err));

app.use("/api/bookings", bookingRoutes);
app.use("/api/fare", fareRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/passengers", require("./routes/Passengerauthroutes"));

app.get("/", (req, res) => {
  res.send("MyCabExpress Backend Running 🚕");
});

// Lightweight keep-alive ping route (for UptimeRobot / Cron-job / Keep-alive)
app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server Running on port ${PORT}`);

  // Keep-alive self-ping every 10 minutes to prevent Render from sleeping
  const BACKEND_URL = process.env.RENDER_EXTERNAL_URL || "https://mycab-backend.onrender.com";
  setInterval(() => {
    fetch(`${BACKEND_URL}/ping`)
      .then((r) => r.text())
      .then(() => console.log("Keep-alive ping sent to keep Render awake ⚡"))
      .catch((err) => console.log("Keep-alive ping error:", err.message));
  }, 10 * 60 * 1000); // 10 minutes
});
