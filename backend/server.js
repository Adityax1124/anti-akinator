require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const seasonRoutes = require('./routes/season');
const { authMiddleware } = require('./middleware/auth');

const app = express();

// ===== CORS (MUST BE FIRST) =====
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// ===== MIDDLEWARE =====
app.use(express.json());

// ===== ROUTES =====
app.use('/api/auth', authRoutes);
app.use('/api/game', authMiddleware, gameRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/profile', authMiddleware, profileRoutes);
app.use('/api/season', seasonRoutes);  // ← Public route

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Anti-Akinator API is running' });
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!',
    success: false
  });
});

// ===== MONGODB =====
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});