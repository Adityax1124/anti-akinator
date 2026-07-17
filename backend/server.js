// /backend/server.js
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
const friendRoutes = require('./routes/friend');
const matchRoutes = require('./routes/match');
const clanRoutes = require('./routes/clan');
const twoFactorRoutes = require('./routes/twofactor');
const { authMiddleware } = require('./middleware/auth');
const cardRoutes = require('./routes/card');

// ✅ NEW: Transaction Routes
const transactionRoutes = require('./routes/transactions');

// ✅ NEW: Season Pass Routes
const seasonPassRoutes = require('./routes/seasonPass');

// ✅ NEW: Blur Game Routes
const blurGameRoutes = require('./routes/blurGame');

// ✅ Get setIO from clanRoutes
const clanSetIO = clanRoutes.setIO;

// ✅ NEW: Clan War Routes
const clanWarRoutes = require('./routes/clanWar');
const chestRoutes = require('./routes/chest');
const notificationRoutes = require('./routes/notification');

// ✅ NEW: War Utils for Timer System
const { checkWarTimers, cleanupOldWars } = require('./utils/warUtils');

const app = express();

// ============================================================
// 🚀 MAX EVENT LISTENERS (For High Concurrency)
// ============================================================
require('events').EventEmitter.defaultMaxListeners = 200;

// ============================================================
// 🚀 SERVER TIMEOUT (Keep-Alive for Long Connections)
// ============================================================
const server = http.createServer(app);
server.timeout = 180000;
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// ============================================================
// 🚀 REQUEST TIMEOUT MIDDLEWARE
// ============================================================
app.use((req, res, next) => {
  req.setTimeout(180000, () => {
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        message: 'Request timeout. Please try again.'
      });
    }
  });
  next();
});

// ============================================================
// 🚀 SOCKET.IO (Optimized for High Concurrency)
// ============================================================
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e8,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  perMessageDeflate: {
    threshold: 1024
  }
});

app.set('io', io);
console.log('🔌 Socket.io instance set on app');

teamRoutes.setIO(io);
console.log('🔌 Socket.io instance passed to team routes');

matchRoutes.setIO(io);
console.log('🔌 Socket.io instance passed to match routes');

clanSetIO(io);
console.log('🛡️ Socket.io instance passed to clan routes');

// ============================================================
// 🚀 TRUST PROXY (For Railway)
// ============================================================
app.set('trust proxy', 1);

// ============================================================
// 🚀 BODY PARSER (Optimized)
// ============================================================
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try { 
      if (buf.length > 0) {
        JSON.parse(buf); 
      }
    } catch (e) { 
      throw new Error('Invalid JSON payload'); 
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// 🚀 SECURITY: HELMET (Optimized for Performance)
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
        'https://anti-akinator.vercel.app',
        'https://anti-akinator.in',
        'https://www.anti-akinator.in' 
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
// 🚀 CSP REPORTING ENDPOINT
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
// 🚀 CORS (Hardened)
// ============================================================
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'https://anti-akinator-silk.vercel.app',
  'https://anti-akinator.vercel.app',
  'https://anti-akinator.in',
  'https://www.anti-akinator.in',
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
// 🚀 RATE LIMITING (MAXIMUM FOR PRO PLAN + M10)
// ============================================================
const isDevelopment = process.env.NODE_ENV !== 'production';

// General API Limiter (500 req/min per IP)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevelopment ? 1000 : 500,
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

// 🔥 LOGIN: 100 attempts per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 200 : 100,
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

// 🔥 REGISTER: 20 accounts per 24 hours per IP
const registerLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: isDevelopment ? 200 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many accounts created from this network. Maximum 20 accounts per IP in 24 hours.'
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

// Game Limiter (200 req/min per IP)
const gameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevelopment ? 500 : 200,
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

// Profile Limiter (100 req/min per IP)
const profileLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevelopment ? 300 : 100,
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

// Admin Limiter (50 req/min per IP)
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevelopment ? 200 : 50,
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

// Transaction Limiter (30 req/min per IP)
const transactionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevelopment ? 100 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many transaction requests. Please slow down.'
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

// Blur Game Limiter (20 req/min per IP)
const blurGameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevelopment ? 50 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many blur game requests. Please slow down.'
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
app.use('/api/auth/register', registerLimiter);
app.use('/api/game', gameLimiter);
app.use('/api/profile', profileLimiter);
app.use('/api/season', profileLimiter);
app.use('/api/admin', adminLimiter);
app.use('/api/shop', profileLimiter);
app.use('/api/referral', profileLimiter);
app.use('/api/transactions', transactionLimiter);
app.use('/api/blur-game', blurGameLimiter);

// ============================================================
// 🚀 HTTPS REDIRECT
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
// 🚀 ADDITIONAL SECURITY HEADERS
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
// 🚀 LOGGING (Sanitized)
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
// 🚀 SOCKET.IO - REAL-TIME EVENTS
// ============================================================
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on('register-user', (data) => {
    if (data?.userId) {
      socket.join(`user_${data.userId}`);
      console.log(`👤 User ${data.userId} registered for private messages`);
    }
  });

  // ===== MATCH SOCKET EVENTS =====
  socket.on('join-match-room', (matchCode) => {
    if (matchCode && matchCode !== 'undefined') {
      socket.join(matchCode);
      console.log(`⚔️ Socket ${socket.id} joined match room: ${matchCode}`);
      socket.to(matchCode).emit('player-joined-match', {
        message: 'A player has joined the match',
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('leave-match-room', (matchCode) => {
    if (matchCode && matchCode !== 'undefined') {
      socket.leave(matchCode);
      console.log(`⚔️ Socket ${socket.id} left match room: ${matchCode}`);
      socket.to(matchCode).emit('player-left-match', {
        message: 'A player has left the match',
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('match-card-selected', (data) => {
    const { matchCode, playerId, cardIndex } = data;
    if (matchCode && matchCode !== 'undefined') {
      io.to(matchCode).emit('match-card-selected', {
        playerId,
        cardIndex,
        timestamp: new Date().toISOString()
      });
      console.log(`⚔️ Player ${playerId} selected card ${cardIndex} in match ${matchCode}`);
    }
  });

  socket.on('match-card-confirmed', (data) => {
    const { matchCode, playerId, cardIndex } = data;
    if (matchCode && matchCode !== 'undefined') {
      io.to(matchCode).emit('match-card-confirmed', {
        playerId,
        cardIndex,
        timestamp: new Date().toISOString()
      });
      console.log(`✅ Player ${playerId} confirmed card ${cardIndex} in match ${matchCode}`);
    }
  });

  socket.on('round-revealed', (data) => {
    const { matchCode, round, winner, player1Card, player2Card } = data;
    if (matchCode && matchCode !== 'undefined') {
      io.to(matchCode).emit('round-revealed', {
        round,
        winner,
        player1Card,
        player2Card,
        timestamp: new Date().toISOString()
      });
      console.log(`🎯 Round ${round} revealed in match ${matchCode}, winner: ${winner}`);
    }
  });

  socket.on('match-ended', (data) => {
    const { matchCode, winner, stolenCard } = data;
    if (matchCode && matchCode !== 'undefined') {
      io.to(matchCode).emit('match-ended', {
        winner,
        stolenCard,
        timestamp: new Date().toISOString()
      });
      console.log(`🏆 Match ${matchCode} ended, winner: ${winner}`);
    }
  });

  socket.on('match-cancelled', (data) => {
    const { matchCode, userId } = data;
    if (matchCode && matchCode !== 'undefined') {
      io.to(matchCode).emit('match-cancelled', {
        matchCode: matchCode,
        message: 'Match has been cancelled',
        cancelledBy: userId
      });
      console.log(`🚫 Match ${matchCode} cancelled by user ${userId}`);
    }
  });

  socket.on('match-chat-message', (data) => {
    const { matchCode, username, message, userId } = data;
    if (matchCode && matchCode !== 'undefined') {
      io.to(matchCode).emit('match-chat-message', {
        username,
        message,
        userId,
        timestamp: new Date().toISOString()
      });
      console.log(`💬 Chat in ${matchCode}: ${username}: ${message}`);
    }
  });

  socket.on('match-selection-timeout', (data) => {
    const { matchCode, playerId } = data;
    if (matchCode && matchCode !== 'undefined') {
      io.to(matchCode).emit('match-selection-timeout', {
        playerId,
        message: 'Selection time ran out! Auto-confirming...',
        timestamp: new Date().toISOString()
      });
      console.log(`⏰ Selection timeout for player ${playerId} in match ${matchCode}`);
    }
  });

  // ===== CLAN SOCKET EVENTS =====
  socket.on('join-clan-room', (clanId) => {
    if (clanId && clanId !== 'undefined') {
      socket.join(`clan_${clanId}`);
      console.log(`🛡️ Socket ${socket.id} joined clan room: ${clanId}`);
    }
  });

  socket.on('leave-clan-room', (clanId) => {
    if (clanId && clanId !== 'undefined') {
      socket.leave(`clan_${clanId}`);
      console.log(`🛡️ Socket ${socket.id} left clan room: ${clanId}`);
    }
  });

  socket.on('clan-chat-message', (data) => {
    const { clanId, username, message, userId } = data;
    if (clanId && clanId !== 'undefined') {
      io.to(`clan_${clanId}`).emit('clan-chat-message', {
        username,
        message,
        userId,
        timestamp: new Date().toISOString()
      });
      console.log(`💬 Clan chat in ${clanId}: ${username}: ${message}`);
    }
  });

  socket.on('clan-donation', (data) => {
    const { clanId, from, to, amount } = data;
    if (clanId && clanId !== 'undefined') {
      io.to(`clan_${clanId}`).emit('clan-donation', {
        from,
        to,
        amount,
        timestamp: new Date().toISOString()
      });
      console.log(`🎁 Donation in clan ${clanId}: ${from} donated ${amount} 💎 to ${to}`);
    }
  });

  // ===== TEAM SOCKET EVENTS =====
  socket.on('join-team-room', (roomCode) => {
    if (roomCode && roomCode !== 'undefined') {
      socket.join(roomCode);
      console.log(`👤 Socket ${socket.id} joined team room: ${roomCode}`);
    }
  });

  socket.on('leave-team-room', (roomCode) => {
    if (roomCode && roomCode !== 'undefined') {
      socket.leave(roomCode);
      console.log(`👋 Socket ${socket.id} left team room: ${roomCode}`);
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
// 🚀 ROUTES (ALL WORKING)
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/game', authMiddleware, gameRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/profile', authMiddleware, profileRoutes);
app.use('/api/season', seasonRoutes);
app.use('/api/shop', authMiddleware, shopRoutes);
app.use('/api/referral', authMiddleware, referralRoutes);
app.use('/api/team', authMiddleware, teamRoutes);
app.use('/api/friend', authMiddleware, friendRoutes);
app.use('/api/match', authMiddleware, matchRoutes);
app.use('/api/clan', authMiddleware, clanRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/cards', authMiddleware, cardRoutes);

// ✅ NEW: Transaction Routes
app.use('/api/transactions', authMiddleware, transactionRoutes);
console.log('💳 Transaction routes loaded!');

// ✅ NEW: Season Pass Routes
app.use('/api/season-pass', authMiddleware, seasonPassRoutes);
console.log('🎫 Season Pass routes loaded!');

// ✅ NEW: Blur Game Routes
app.use('/api/blur-game', authMiddleware, blurGameRoutes);
console.log('🔮 Blur Game routes loaded!');

// ✅ NEW: Clan War Routes
app.use('/api/clan-war', authMiddleware, clanWarRoutes);
app.use('/api/chests', authMiddleware, chestRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);

// ============================================================
// ✅ NEW: CLAN WAR TIMER SYSTEM
// ============================================================
console.log('⚔️ Starting Clan War Timer System...');

// Run war timers every minute
const timerInterval = setInterval(async () => {
  try {
    await checkWarTimers();
  } catch (error) {
    console.error('❌ War timer error:', error);
  }
}, 60000);

// Run cleanup daily (24 hours)
const cleanupInterval = setInterval(async () => {
  try {
    await cleanupOldWars();
  } catch (error) {
    console.error('❌ War cleanup error:', error);
  }
}, 24 * 60 * 60 * 1000);

// Store intervals for graceful shutdown
process.on('SIGTERM', () => {
  clearInterval(timerInterval);
  clearInterval(cleanupInterval);
});

console.log('✅ Clan War Timer System started!');
console.log('⏰ War timers run every 60 seconds');
console.log('🧹 Cleanup runs every 24 hours');

// ============================================================
// 🚀 AGORA TOKEN GENERATOR
// ============================================================
app.get('/api/agora-token', authMiddleware, (req, res) => {
  try {
    const channelName = req.query.channel || 'default';
    const uid = req.user._id.toString();
    console.log(`👤 User: ${req.user.username}, UID: ${uid}`);
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
      parseInt(uid.slice(-8), 16),
      role,
      privilegeExpiredTs
    );

    console.log(`✅ Agora token: UID=${parseInt(uid.slice(-8), 16)}, channel=${channelName}`);

    res.json({
      success: true,
      token: token,
      appId: APP_ID,
      channel: channelName,
      uid: parseInt(uid.slice(-8), 16)
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
// 🚀 HEALTH CHECK
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Anti-Akinator API is running',
    environment: process.env.NODE_ENV || 'development',
    secure: process.env.NODE_ENV === 'production',
    timestamp: new Date().toISOString(),
    replicas: 12,
    maxPoolSize: 100,
    clanWar: {
      enabled: true,
      timerInterval: '60 seconds',
      cleanupInterval: '24 hours'
    },
    transactions: {
      enabled: true,
      limiter: '30 req/min'
    },
    blurGame: {
      enabled: true,
      limiter: '20 req/min'
    }
  });
});

// ============================================================
// 🚀 ERROR HANDLER
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
// 🚀 MONGODB CONNECTION (MAXIMUM POOL FOR M10)
// ============================================================
const isProduction = process.env.NODE_ENV === 'production';
console.log(`🔐 MongoDB SSL: ${isProduction ? 'Enabled' : 'Disabled (development)'}`);

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 100,
  minPoolSize: 10,
  ...(isProduction && {
    tls: true,
    tlsAllowInvalidCertificates: false,
  }),
  ...(!isProduction && {
    tlsAllowInvalidCertificates: true,
  })
})
  .then(() => console.log('✅ Connected to MongoDB with maxPoolSize=100'))
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
// 🚀 GRACEFUL SHUTDOWN
// ============================================================
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, closing server...');
  clearInterval(timerInterval);
  clearInterval(cleanupInterval);
  mongoose.connection.close(() => {
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, closing server...');
  clearInterval(timerInterval);
  clearInterval(cleanupInterval);
  mongoose.connection.close(() => {
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  });
});

// ============================================================
// 🚀 START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 HTTPS: ${isProduction ? 'Enabled' : 'Disabled'}`);
  console.log(`📡 API URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
  console.log(`🔗 Healthcheck: /api/health`);
  console.log(`🔌 Socket.io is ready`);
  console.log(`⚔️ Match routes loaded with socket events`);
  console.log(`🛡️ Clan routes loaded with socket events`);
  console.log(`⚔️ Clan War routes loaded!`);
  console.log(`🎁 Chest routes loaded!`);
  console.log(`🔔 Notification routes loaded!`);
  console.log(`💳 Transaction routes loaded!`);
  console.log(`🎫 Season Pass routes loaded!`);
  console.log(`🔮 Blur Game routes loaded!`);
  console.log(`⏰ Server timeout: 180 seconds`);
  console.log(`📊 maxPoolSize: 100, maxListeners: 200, rate limits: 500/min`);
  console.log(`📊 Login: 100/15min, Register: 20/24hrs`);
  console.log(`📊 Transactions: 30 req/min`);
  console.log(`📊 Blur Game: 20 req/min`);
  console.log(`⚔️ Clan War Timer System: Running every 60 seconds`);
});