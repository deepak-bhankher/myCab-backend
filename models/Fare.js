const mongoose = require("mongoose");

const fareSchema = new mongoose.Schema({
  pickupCity: {
    type: String,
    required: true
  },
  dropCity: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model("Fare", fareSchema);