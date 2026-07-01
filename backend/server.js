require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const seasonRoutes = require('./routes/season');
const twoFactorRoutes = require('./routes/twofactor'); // ← ADD THIS
const { authMiddleware } = require('./middleware/auth');

const app = express();

// ===== SECURITY: HELMET =====
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

// ===== CSP REPORTING ENDPOINT =====
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

// ===== SECURITY: CORS =====
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
  exposedHeaders: ['X-CSRF-Token'],
  maxAge: 600
}));

// ===== RATE LIMITING =====
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
  skip: (req) => req.path === '/api/health' || req.path === '/api/csp-report'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' }
});

const gameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many game requests. Please slow down.' }
});

const profileLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many profile requests. Please slow down.' }
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/game', gameLimiter);
app.use('/api/profile', profileLimiter);
app.use('/api/season', profileLimiter);8

// ===== REQUEST SIZE LIMIT =====
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try { JSON.parse(buf); } catch (e) { throw new Error('Invalid JSON payload'); }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== HTTPS REDIRECT =====
app.use((req, res, next) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const isSecure = forwardedProto === 'https' || req.secure || req.protocol === 'https';
  if (process.env.NODE_ENV === 'production' && !isSecure) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// ===== SECURITY HEADERS =====
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// ===== LOGGING =====
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
// ROUTES
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/game', authMiddleware, gameRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/profile', authMiddleware, profileRoutes);
app.use('/api/season', seasonRoutes);
app.use('/api/2fa', twoFactorRoutes); // ← ADD THIS LINE

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Anti-Akinator API is running',
    environment: process.env.NODE_ENV || 'development',
    secure: process.env.NODE_ENV === 'production'
  });
});

// ===== ERROR HANDLER =====
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

// ===== MONGODB CONNECTION =====
const isProduction = process.env.NODE_ENV === 'production';
console.log(`🔐 MongoDB SSL: ${isProduction ? 'Enabled' : 'Disabled (development)'}`);

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
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

// ===== GRACEFUL SHUTDOWN =====
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 HTTPS: ${isProduction ? 'Enabled' : 'Disabled (development)'}`);
  console.log(`📡 API URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
});