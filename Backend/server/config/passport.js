const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email  = profile.emails?.[0]?.value;
        const avatar = profile.photos?.[0]?.value || null;

        // 1. Already linked via googleId
        let user = await User.findOne({ googleId: profile.id });

        if (!user && email) {
          // 2. Existing email account → link Google to it
          user = await User.findOne({ email });
          if (user) {
            user.googleId = profile.id;
            if (!user.avatar) user.avatar = avatar;
            await user.save();
          } else {
            // 3. Brand-new user via Google
            user = await User.create({
              name:     profile.displayName || 'PixelBoard User',
              email,
              googleId: profile.id,
              avatar,
            });
          }
        }

        if (!user) return done(new Error('Could not create user from Google profile'), null);
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Minimal serialization (only used for the OAuth redirect cycle)
passport.serializeUser((user, done)   => done(null, user._id.toString()));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
