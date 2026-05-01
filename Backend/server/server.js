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

// Support multiple origins: set CLIENT_URL to a comma-separated list if needed
// e.g. "https://pixel-board-navy.vercel.app,https://pixelboard-cyan.vercel.app"
const ALLOWED_ORIGINS = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((u) => u.trim());

// Trust Render / Vercel reverse proxy so rate-limiter and secure cookies work
app.set('trust proxy', 1);

// Dynamic origin checker — works with one or many origins
const corsOrigin = (origin, cb) => {
  // Allow requests with no origin (mobile apps, curl, server-to-server)
  if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
  cb(new Error('Not allowed by CORS'));
};

// Initialize Socket.io with CORS
const io = new Server(httpServer, {
  maxHttpBufferSize: 50 * 1024 * 1024, // 50 MB — supports large file sharing (PDFs, images)
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ─── Express Middleware ────────────────────────────────────────────────────────
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session required by Passport for the OAuth redirect cycle
app.use(session({
  secret:            process.env.SESSION_SECRET || 'pixelboard_session_secret',
  resave:            false,
  saveUninitialized: false,
  proxy:             true,
  cookie: {
    httpOnly: true,
    secure:   true,
    sameSite: 'none',
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// ─── Request Logging Middleware ────────────────────────────────────────────────
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  
  console.log(`\n[${timestamp}] 📨 ${method} ${url}`);
  
  // Log query parameters if present
  if (Object.keys(req.query).length > 0) {
    console.log(`   Query: ${JSON.stringify(req.query)}`);
  }
  
  // Log request body for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
    const bodyStr = JSON.stringify(req.body);
    const truncatedBody = bodyStr.length > 200 ? bodyStr.substring(0, 200) + '...' : bodyStr;
    console.log(`   Body: ${truncatedBody}`);
  }
  
  // Log IP address
  const ip = req.ip || req.connection.remoteAddress;
  console.log(`   IP: ${ip}`);
  
  // Log response status when response is sent
  const originalJson = res.json;
  res.json = function(data) {
    console.log(`   ✅ Response: ${res.statusCode}`);
    return originalJson.call(this, data);
  };
  
  next();
});

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
