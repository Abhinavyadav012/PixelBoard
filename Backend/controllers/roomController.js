const Room = require('../models/Room');
const { v4: uuidv4 } = require('uuid');

/**
 * @desc    Create a new whiteboard room
 * @route   POST /api/rooms/create
 * @access  Private
 */
const createRoom = async (req, res) => {
  try {
    const { name, roomCode } = req.body;

    // If a custom room code was provided, validate it
    let roomId = roomCode ? roomCode.trim() : uuidv4();
    if (roomCode) {
      if (!/^[a-zA-Z0-9_-]{4,40}$/.test(roomId)) {
        return res.status(400).json({ message: 'Room code must be 4–40 characters (letters, numbers, - or _)' });
      }
      const existing = await Room.findOne({ roomId });
      if (existing) {
        return res.status(409).json({ message: 'Room code already taken — try a different one' });
      }
    }

    const room = await Room.create({
      roomId,
      name: name ? name.trim().slice(0, 60) : '',
      host: req.user._id,
      participants: [req.user._id],
    });

    return res.status(201).json({
      message: 'Room created successfully',
      room,
    });
  } catch (error) {
    console.error('Create Room Error:', error.message);
    return res.status(500).json({ message: 'Server error creating room' });
  }
};

/**
 * @desc    Join an existing room using roomId
 * @route   POST /api/rooms/join
 * @access  Private
 */
const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ message: 'Room ID is required' });
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Add participant only if not already in the room (compare as strings to handle ObjectId)
    const alreadyJoined = room.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!alreadyJoined) {
      room.participants.push(req.user._id);
      await room.save();
    }

    return res.status(200).json({
      message: 'Joined room successfully',
      room,
    });
  } catch (error) {
    console.error('Join Room Error:', error.message);
    return res.status(500).json({ message: 'Server error joining room' });
  }
};

/**
 * @desc    Get room details by roomId
 * @route   GET /api/rooms/:roomId
 * @access  Private
 */
const getRoomDetails = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId })
      .populate('host', 'name email')
      .populate('participants', 'name email');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    return res.status(200).json(room);
  } catch (error) {
    console.error('Get Room Error:', error.message);
    return res.status(500).json({ message: 'Server error fetching room' });
  }
};

/**
 * @desc    Get all rooms the current user is part of (as host or participant)
 * @route   GET /api/rooms
 * @access  Private
 */
const getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ participants: req.user._id })
      .populate('host', 'name email')
      .populate('participants', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json(rooms);
  } catch (error) {
    console.error('Get All Rooms Error:', error.message);
    return res.status(500).json({ message: 'Server error fetching rooms' });
  }
};

/**
 * @desc    Delete a room (host only)
 * @route   DELETE /api/rooms/:roomId
 * @access  Private
 */
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (room.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the host can delete this room' });
    }
    await room.deleteOne();
    return res.status(200).json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Delete Room Error:', error.message);
    return res.status(500).json({ message: 'Server error deleting room' });
  }
};

/**
 * @desc    Leave a room (remove self from participants — non-host only)
 * @route   POST /api/rooms/:roomId/leave
 * @access  Private
 */
const leaveRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (room.host.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Host cannot leave — delete the room instead' });
    }
    room.participants = room.participants.filter(
      (p) => p.toString() !== req.user._id.toString()
    );
    await room.save();
    return res.status(200).json({ message: 'Left room successfully' });
  } catch (error) {
    console.error('Leave Room Error:', error.message);
    return res.status(500).json({ message: 'Server error leaving room' });
  }
};

module.exports = { createRoom, joinRoom, getRoomDetails, getAllRooms, deleteRoom, leaveRoom };
