const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, changePassword } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// All user routes are protected
router.use(protect);

// @route  GET /api/users/profile
router.get('/profile', getProfile);

// @route  PUT /api/users/profile
router.put('/profile', updateProfile);

// @route  PUT /api/users/profile/password
router.put('/profile/password', changePassword);

module.exports = router;
