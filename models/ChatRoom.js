const mongoose = require('mongoose');
const db = require('../config/database');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users', 
    required: true,
  },
  content: {
    type: String,
    required: true,
  }
}, { timestamps: true });

const ChatRoomSchema = new mongoose.Schema({
  isGroupChat: {
    type: Boolean,
    default: false, 
  },
  groupName: {
    type: String,
    required: function() { return this.isGroupChat; } 
  },
  groupDescription: {
    type: String,
    required: function() { return this.isGroupChat; } 
  },
  groupAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: function() { return this.isGroupChat; } 
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users', 
    required: true,
  }],
  messages: [MessageSchema],
}, { timestamps: true });

module.exports = db.model('chatroom', ChatRoomSchema);

