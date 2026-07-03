require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIO = require('socket.io');
const { RtcTokenBuilder, RtcRole } = require('agora-token');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const seasonRoutes = require('./routes/season');
const shopRoutes = require('./routes/shop');
const referralRoutes = require('./routes/referral');
const teamRoutes = require('./routes/team');
const twoFactorRoutes = require('./routes/twofactor');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }
});

// ============================================================
// TRUST PROXY (Secure for Railway/Vercel)
// ============================================================
app.set('trust proxy', 1);

// ============================================================
// SECURITY: HELMET (Security Headers)
// ============================================================
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: [
        "'self'", 
        process.env.CLIENT_URL || 'http://localhost:5173',
        'https://anti-akinator-silk.vercel.app',
        'https://anti-akinator.vercel.app'
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
      reportUri: '/api/csp-report'
    },
    reportOnly: process.env.NODE_ENV !== 'production'
  },
  crossOriginEmbedderPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
  noSniff: true,
  frameguard: { action: 'deny' },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' }
}));

// ============================================================
// CSP REPORTING ENDPOINT
// ============================================================
app.post('/api/csp-report', express.json({ type: ['json', 'csp-report'] }), (req, res) => {
  if (req.body && req.body['csp-report']) {
    const report = req.body['csp-report'];
    console.warn('⚠️ CSP Violation:', {
      'violated-directive': report['violated-directive'],
      'blocked-uri': report['blocked-uri'],
      'source-file': report['source-file']
    });
  }
  res.status(204).end();
});

// ============================================================
// SECURITY: CORS (Hardened)
// ============================================================
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'https://anti-akinator-silk.vercel.app',
  'https://anti-akinator.vercel.app',
  'https://anti-akinator-production.up.railway.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.warn('🚫 CORS blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-CSRF-Token',
    'x-content-type-options',
    'X-Content-Type-Options'
  ],
  exposedHeaders: ['X-CSRF-Token'],
  maxAge: 600
}));

// ============================================================
// RATE LIMITING
// ============================================================
const isDevelopment = process.env.NODE_ENV !== 'production';

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevelopment ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.'
  },
  skip: (req) => {
    if (isDevelopment) return true;
    return req.path === '/api/health' || req.path === '/api/csp-report';
  },
  validate: {
    trustProxy: false,
    xForwardedForHeader: false
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 100 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.'
  },
  skip: (req) => {
    if (isDevelopment) return true;
    return false;
  },
  validate: {
    trustProxy: false,
    xForwardedForHeader: false
  }
});

const gameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevelopment ? 500 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many game requests. Please slow down.'
  },
  skip: (req) => {
    if (isDevelopment) return true;
    return false;
  },
  validate: {
    trustProxy: false,
    xForwardedForHeader: false
  }
});

const profileLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevelopment ? 300 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many profile requests. Please slow down.'
  },
  skip: (req) => {
    if (isDevelopment) return true;
    return false;
  },
  validate: {
    trustProxy: false,
    xForwardedForHeader: false
  }
});

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevelopment ? 200 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many admin requests. Please slow down.'
  },
  skip: (req) => {
    if (isDevelopment) return true;
    return false;
  },
  validate: {
    trustProxy: false,
    xForwardedForHeader: false
  }
});

// Apply rate limiters
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/game', gameLimiter);
app.use('/api/profile', profileLimiter);
app.use('/api/season', profileLimiter);
app.use('/api/admin', adminLimiter);
app.use('/api/shop', profileLimiter);
app.use('/api/referral', profileLimiter);

// ============================================================
// REQUEST SIZE LIMIT
// ============================================================
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try { JSON.parse(buf); } catch (e) { throw new Error('Invalid JSON payload'); }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// HTTPS REDIRECT
// ============================================================
app.use((req, res, next) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const isSecure = forwardedProto === 'https' || req.secure || req.protocol === 'https';
  if (process.env.NODE_ENV === 'production' && !isSecure) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// ============================================================
// ADDITIONAL SECURITY HEADERS
// ============================================================
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// ============================================================
// LOGGING (Sanitized)
// ============================================================
app.use((req, res, next) => {
  const startTime = Date.now();
  const sanitizedPath = req.path.replace(/\/[0-9a-f]{24}\b/g, '/:id');
  console.log(`📝 ${req.method} ${sanitizedPath} - ${req.ip}`);
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`✅ ${req.method} ${sanitizedPath} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// ============================================================
// SOCKET.IO - REAL-TIME MULTIPLAYER WITH VOICE
// ============================================================
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on('join-team-room', (roomCode) => {
    if (roomCode && roomCode !== 'undefined') {
      socket.join(roomCode);
      console.log(`👤 Socket ${socket.id} joined room: ${roomCode}`);
    }
  });

  socket.on('leave-team-room', (roomCode) => {
    if (roomCode && roomCode !== 'undefined') {
      socket.leave(roomCode);
      console.log(`👋 Socket ${socket.id} left room: ${roomCode}`);
    }
  });

  socket.on('user-joined-voice', (data) => {
    const { roomCode, username } = data;
    if (roomCode && roomCode !== 'undefined') {
      socket.to(roomCode).emit('user-joined-voice', { username });
      console.log(`🎤 ${username} joined voice in room: ${roomCode}`);
    }
  });

  socket.on('user-left-voice', (data) => {
    const { roomCode, username } = data;
    if (roomCode && roomCode !== 'undefined') {
      socket.to(roomCode).emit('user-left-voice', { username });
      console.log(`🎤 ${username} left voice in room: ${roomCode}`);
    }
  });

  socket.on('voice-offer', (data) => {
    const { roomCode, to, offer, from } = data;
    if (roomCode && roomCode !== 'undefined') {
      socket.to(roomCode).emit('voice-offer', { from, offer });
      console.log(`📞 Voice offer from ${from} to ${to} in room: ${roomCode}`);
    }
  });

  socket.on('voice-answer', (data) => {
    const { roomCode, to, answer, from } = data;
    if (roomCode && roomCode !== 'undefined') {
      socket.to(roomCode).emit('voice-answer', { from, answer });
      console.log(`📞 Voice answer from ${from} to ${to} in room: ${roomCode}`);
    }
  });

  socket.on('voice-ice-candidate', (data) => {
    const { roomCode, to, candidate, from } = data;
    if (roomCode && roomCode !== 'undefined') {
      socket.to(roomCode).emit('voice-ice-candidate', { from, candidate });
      console.log(`🧊 ICE candidate from ${from} to ${to} in room: ${roomCode}`);
    }
  });

  socket.on('player-joined', (data) => {
    const { roomCode, player } = data;
    if (roomCode && roomCode !== 'undefined') {
      console.log(`📢 Player ${player.username} joined room ${roomCode}`);
      io.to(roomCode).emit('player-update', { type: 'joined', player });
    }
  });

  socket.on('game-started', (data) => {
    const { roomCode } = data;
    if (roomCode && roomCode !== 'undefined') {
      console.log(`🎮 Game started in room ${roomCode}`);
      io.to(roomCode).emit('game-started', { type: 'started' });
    }
  });

  socket.on('player-left', (data) => {
    const { roomCode, player } = data;
    if (roomCode && roomCode !== 'undefined') {
      console.log(`🚪 Player ${player.username} left room ${roomCode}`);
      io.to(roomCode).emit('player-update', { type: 'left', player });
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// ============================================================
// ROUTES
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/game', authMiddleware, gameRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/profile', authMiddleware, profileRoutes);
app.use('/api/season', seasonRoutes);
app.use('/api/shop', authMiddleware, shopRoutes);
app.use('/api/referral', authMiddleware, referralRoutes);
app.use('/api/team', authMiddleware, teamRoutes);
app.use('/api/2fa', twoFactorRoutes);

// ============================================================
// AGORA TOKEN GENERATOR (FIXED UID)
// ============================================================
app.get('/api/agora-token', authMiddleware, (req, res) => {
  try {
    const channelName = req.query.channel || 'default';
    
    // ✅ UID must be between 0 and 10000 (Agora limit)
    const uid = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
    
    const role = RtcRole.PUBLISHER;
    const expireTime = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expireTime;

    const APP_ID = process.env.AGORA_APP_ID;
    const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

    if (!APP_ID || !APP_CERTIFICATE) {
      console.error('❌ Agora credentials not configured');
      return res.status(500).json({
        success: false,
        message: 'Agora credentials not configured'
      });
    }

    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid,
      role,
      privilegeExpiredTs
    );

    console.log('✅ Agora token generated for UID:', uid, 'channel:', channelName);

    res.json({
      success: true,
      token: token,
      appId: APP_ID,
      channel: channelName,
      uid: uid
    });
  } catch (error) {
    console.error('❌ Error generating Agora token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate Agora token'
    });
  }
});

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Anti-Akinator API is running',
    environment: process.env.NODE_ENV || 'development',
    secure: process.env.NODE_ENV === 'production',
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// ERROR HANDLER (Sanitized)
// ============================================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  const statusCode = err.status || 500;
  const message = statusCode === 500 
    ? 'Something went wrong. Please try again later.' 
    : err.message || 'An error occurred';

  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================
// MONGODB CONNECTION
// ============================================================
const isProduction = process.env.NODE_ENV === 'production';
console.log(`🔐 MongoDB SSL: ${isProduction ? 'Enabled' : 'Disabled (development)'}`);

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  ...(isProduction && {
    tls: true,
    tlsAllowInvalidCertificates: false,
  }),
  ...(!isProduction && {
    tlsAllowInvalidCertificates: true,
  })
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    if (isProduction) process.exit(1);
  });

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, closing server...');
  mongoose.connection.close(() => {
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, closing server...');
  mongoose.connection.close(() => {
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  });
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 HTTPS: ${isProduction ? 'Enabled' : 'Disabled'}`);
  console.log(`📡 API URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
  console.log(`🔗 Healthcheck: /api/health`);
  console.log(`🔌 Socket.io is ready`);
});