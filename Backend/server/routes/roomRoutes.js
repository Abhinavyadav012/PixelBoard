const express = require('express');
const router = express.Router();
const {
  createRoom,
  joinRoom,
  getRoomDetails,
  getAllRooms,
  deleteRoom,
  leaveRoom,
} = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');

// All room routes are protected
router.use(protect);

// @route  GET  /api/rooms
router.get('/', getAllRooms);

// @route  POST /api/rooms/create
router.post('/create', createRoom);

// @route  POST /api/rooms/join
router.post('/join', joinRoom);

// @route  POST /api/rooms/:roomId/leave
router.post('/:roomId/leave', leaveRoom);

// @route  GET    /api/rooms/:roomId
router.get('/:roomId', getRoomDetails);

// @route  DELETE /api/rooms/:roomId
router.delete('/:roomId', deleteRoom);

module.exports = router;
