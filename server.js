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


app.get("/", (req, res) => {
  res.send("MyCabExpress Backend Running 🚕");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server Running on port ${PORT}`);
});
