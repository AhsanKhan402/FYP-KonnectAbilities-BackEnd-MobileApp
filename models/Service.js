const mongoose = require("mongoose");
const db = require("../config/database");

const ServiceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users", // Reference to the User schema
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  pickLocation: {
    type: String,
    required: true,
  },
  dropLocation: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'canceled', 'completed'],
    default: 'pending',
  },
}, { timestamps: true });

module.exports = db.model("services", ServiceSchema);
