const User = require('../models/User');
const bcrypt = require('bcryptjs');

/**
 * @desc    Get own profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json(user);
  } catch (err) {
    console.error('Get Profile Error:', err.message);
    return res.status(500).json({ message: 'Server error fetching profile' });
  }
};

/**
 * @desc    Update name and/or avatar (base64 data URL)
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const { name, avatar } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name !== undefined) {
      const trimmed = name.trim();
      if (!trimmed) return res.status(400).json({ message: 'Name cannot be empty' });
      if (trimmed.length > 50) return res.status(400).json({ message: 'Name too long (max 50 chars)' });
      user.name = trimmed;
    }

    if (avatar !== undefined) {
      // Accept null (remove avatar) or a base64 data URL
      if (avatar !== null && !avatar.startsWith('data:image/')) {
        return res.status(400).json({ message: 'Avatar must be a valid image data URL' });
      }
      user.avatar = avatar;
    }

    const updated = await user.save();
    return res.status(200).json({
      _id: updated._id,
      name: updated.name,
      email: updated.email,
      avatar: updated.avatar,
    });
  } catch (err) {
    console.error('Update Profile Error:', err.message);
    return res.status(500).json({ message: 'Server error updating profile' });
  }
};

/**
 * @desc    Change password (email/password accounts only)
 * @route   PUT /api/users/profile/password
 * @access  Private
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // OAuth-only accounts have no password
    if (!user.password) {
      return res.status(400).json({ message: 'Password change is not available for Google accounts' });
    }

    const match = await user.matchPassword(currentPassword);
    if (!match) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword; // pre-save hook will hash it
    await user.save();

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change Password Error:', err.message);
    return res.status(500).json({ message: 'Server error changing password' });
  }
};

module.exports = { getProfile, updateProfile, changePassword };
