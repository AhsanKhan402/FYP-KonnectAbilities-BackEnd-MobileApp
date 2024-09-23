const mongoose = require('mongoose');
const db = require('../config/database');

const CommentSchema = new mongoose.Schema({
  userInfo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
}, { timestamps: true });

const PostSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
  userInfo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users', 
  }],
  shares: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users', 
  }],
  comments: [CommentSchema],
}, { timestamps: true });

module.exports = db.model('posts', PostSchema);
