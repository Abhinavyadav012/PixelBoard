const express = require('express');
const router = express.Router();
const { sendMessage, getRoomMessages } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

// All message routes are protected
router.use(protect);

// @route  POST /api/messages/send
router.post('/send', sendMessage);

// @route  GET  /api/messages/:roomId
router.get('/:roomId', getRoomMessages);

module.exports = router;
