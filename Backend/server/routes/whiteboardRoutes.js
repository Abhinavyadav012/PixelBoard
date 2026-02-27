const express = require('express');
const router = express.Router();
const Whiteboard = require('../models/Whiteboard');
const { protect } = require('../middleware/authMiddleware');

// All whiteboard routes are protected
router.use(protect);

// @route  GET /api/whiteboard/:roomId
// @desc   Get all strokes for a room
// @access Private
router.get('/:roomId', async (req, res) => {
  try {
    const board = await Whiteboard.findOne({ roomId: req.params.roomId });
    if (!board) {
      return res.status(200).json({ strokes: [] });
    }
    return res.status(200).json({ strokes: board.strokes });
  } catch (error) {
    console.error('Get Whiteboard Error:', error.message);
    return res.status(500).json({ message: 'Server error fetching whiteboard' });
  }
});

module.exports = router;
