const mongoose = require('mongoose');

/**
 * Whiteboard Schema
 * Persists drawing strokes for a room so users can reload canvas state
 */
const whiteboardSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: [true, 'Room ID is required'],
    unique: true,
    trim: true,
  },
  strokes: [
    {
      // Each stroke is a free-form object (tool, color, size, points array, etc.)
      type: mongoose.Schema.Types.Mixed,
    },
  ],
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Whiteboard', whiteboardSchema);
