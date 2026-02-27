const mongoose = require('mongoose');

/**
 * Room Schema
 * Represents a collaborative whiteboard room identified by a unique roomId
 */
const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: [true, 'Room ID is required'],
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    trim: true,
    default: '',
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  /** 'public' — everyone can draw/write; 'host-only' — only host can edit */
  boardMode: {
    type: String,
    enum: ['public', 'host-only'],
    default: 'public',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Room', roomSchema);
