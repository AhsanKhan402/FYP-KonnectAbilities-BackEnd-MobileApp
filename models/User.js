const mongoose = require("mongoose");
const db = require("../config/database");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  profileImage: {
    type: String,
  },
  bio: {
    type: String,
  },
  phoneNumber: {
    type: String,
  },
  dateOfBirth: {
    type: String,
  },
  city: {
    type: String,
  },
  disability: {
    type: String,
  },
  followStatus: {
    type: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
      followed: { type: Boolean, default: false }
    }],
    default: [],
  },
  isVerified: {
    type: String,
    enum: ['not verified', 'verify request', 'verified'],
    default: 'not verified',
  },
  verificationFile: {
    type: String,
  },
  verificationDescription: {
    type: String,
  }
}, { timestamps: true });

module.exports = db.model("users", UserSchema);
