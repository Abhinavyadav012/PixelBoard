const path = require('path');
const dotenv = require('dotenv');

// Load .env FIRST — before any module that reads process.env on require()
dotenv.config({ path: path.join(__dirname, '.env') });

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const passport = require('./config/passport');

const connectDB = require('./config/DB');
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const messageRoutes = require('./routes/messageRoutes');
const whiteboardRoutes = require('./routes/whiteboardRoutes');
const userRoutes = require('./routes/userRoutes');
const socketHandler = require('./sockets/socketHandler');

// ─── Rate limiters ────────────────────────────────────────────────────────────
/** Strict limiter for auth endpoints (login / register) */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests — please try again in 15 minutes' },
});

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = http.createServer(app);

const isProduction = process.env.NODE_ENV === 'production';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Trust Render / Vercel reverse proxy so rate-limiter and secure cookies work
if (isProduction) app.set('trust proxy', 1);

// Initialize Socket.io with CORS
const io = new Server(httpServer, {
  maxHttpBufferSize: 50 * 1024 * 1024, // 50 MB — supports large file sharing (PDFs, images)
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ─── Express Middleware ────────────────────────────────────────────────────────
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session required by Passport for the OAuth redirect cycle
app.use(session({
  secret:            process.env.SESSION_SECRET || 'pixelboard_session_secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   isProduction,           // true on HTTPS (Render), false on localhost
    sameSite: isProduction ? 'none' : 'lax',  // cross-site cookies for Vercel→Render
    maxAge:   10 * 60 * 1000,         // 10 min — only for OAuth handshake
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// ─── REST API Routes ──────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/whiteboard', whiteboardRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'PixelBoard API is running 🎨' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// ─── Socket.io Handler ────────────────────────────────────────────────────────
socketHandler(io);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});

// Handle port already in use — exits cleanly so nodemon can retry
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Free it and save any file to restart.`);
    process.exit(1);
  } else {
    throw err;
  }
});
