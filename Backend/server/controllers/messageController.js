const Message = require('../models/Message');
const Room = require('../models/Room');

/**
 * @desc    Send a message to a room (HTTP fallback)
 * @route   POST /api/messages/send
 * @access  Private
 */
const sendMessage = async (req, res) => {
  try {
    const { roomId, text } = req.body;

    if (!roomId || !text) {
      return res.status(400).json({ message: 'Room ID and text are required' });
    }

    // Verify room exists
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const message = await Message.create({
      roomId,
      sender: req.user._id,
      text,
    });

    // Populate sender details before returning
    await message.populate('sender', 'name email');

    return res.status(201).json(message);
  } catch (error) {
    console.error('Send Message Error:', error.message);
    return res.status(500).json({ message: 'Server error sending message' });
  }
};

/**
 * @desc    Get paginated chat messages for a room
 * @route   GET /api/messages/:roomId?page=1&limit=30
 * @access  Private
 *
 * Returns:
 *   { messages: [...], page, totalPages, total, hasMore }
 *
 * Messages are returned newest-last (chronological) within the page.
 * page=1 = most recent batch; page=2 = the batch before that, etc.
 */
const getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));

    // Verify room exists
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const total = await Message.countDocuments({ roomId });
    const totalPages = Math.ceil(total / limit);

    // Fetch descending (newest first), then reverse so the caller gets
    // them oldest-to-newest within the page (matching chat display order)
    const messages = await Message.find({ roomId })
      .populate('sender', 'name email avatar')
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    messages.reverse();

    return res.status(200).json({
      messages,
      page,
      totalPages,
      total,
      hasMore: page < totalPages,
    });
  } catch (error) {
    console.error('Get Messages Error:', error.message);
    return res.status(500).json({ message: 'Server error fetching messages' });
  }
};

module.exports = { sendMessage, getRoomMessages };
