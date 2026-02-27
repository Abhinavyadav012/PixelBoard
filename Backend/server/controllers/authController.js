const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT token for a given user ID
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create new user (password is hashed via pre-save hook in model)
    const user = await User.create({ name, email, password });

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Register Error:', error.message);
    return res.status(500).json({ message: 'Server error during registration' });
  }
};

/**
 * @desc    Login existing user
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password match
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

/**
 * @desc    Get logged-in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json(user);
  } catch (error) {
    console.error('GetMe Error:', error.message);
    return res.status(500).json({ message: 'Server error fetching profile' });
  }
};

/**
 * @desc    Google OAuth callback — issue JWT and redirect to frontend
 * @route   GET /api/auth/google/callback
 * @access  Public (OAuth)
 */
const googleCallback = (req, res) => {
  try {
    const user  = req.user;
    const token = generateToken(user._id);
    const params = new URLSearchParams({
      token,
      id:     user._id.toString(),
      name:   user.name   || '',
      email:  user.email  || '',
      avatar: user.avatar || '',
    });
    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').split(',')[0].trim();
    res.redirect(`${clientUrl}/auth/callback?${params.toString()}`);
  } catch (err) {
    console.error('Google Callback Error:', err.message);
    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').split(',')[0].trim();
    res.redirect(`${clientUrl}/auth?error=oauth_failed`);
  }
};

module.exports = { registerUser, loginUser, getMe, googleCallback };
