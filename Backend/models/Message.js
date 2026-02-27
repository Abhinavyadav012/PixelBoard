const mongoose = require('mongoose');

/**
 * Message Schema
 * Stores chat messages scoped to a whiteboard room
 */
const messageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: [true, 'Room ID is required'],
    trim: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    trim: true,
    default: '',
  },
  /** 'text' | 'file' */
  messageType: {
    type: String,
    enum: ['text', 'file'],
    default: 'text',
  },
  /** base64 data URL (for file messages) */
  fileData: { type: String, default: null },
  fileName: { type: String, default: null },
  fileType: { type: String, default: null },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Message', messageSchema);
