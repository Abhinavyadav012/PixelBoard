const express = require('express');
const router  = express.Router();
const passport = require('passport');
const { registerUser, loginUser, getMe, googleCallback } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// @route  POST /api/auth/register
router.post('/register', registerUser);

// @route  POST /api/auth/login
router.post('/login', loginUser);

// @route  GET /api/auth/me  (Protected)
router.get('/me', protect, getMe);

// ── Google OAuth ────────────────────────────────────────────────────────────
// @route  GET /api/auth/google  →  Redirect to Google consent screen
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// @route  GET /api/auth/google/callback  →  Google redirects back here
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth?error=oauth_failed`,
  }),
  googleCallback
);

module.exports = router;
