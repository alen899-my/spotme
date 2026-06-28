require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');

const isProduction = process.env.NODE_ENV === 'production';
const authRoutes = require('./routes/auth');
const onboardingRoutes = require('./routes/onboarding');
const profileRoutes = require('./routes/profile');
const exercisesRoutes = require('./routes/exercises');
const workoutRoutes = require('./routes/workouts');
const dailyRoutes = require('./routes/daily');
const mealsRoutes = require('./routes/meals');
const waterRoutes = require('./routes/water');
const leaderboardRoutes = require('./routes/leaderboard');
const weightRoutes = require('./routes/weight');
const notificationRoutes = require('./routes/notifications');
const physiqueRoutes = require('./routes/physique');
const adminRoutes = require('./routes/admin');
const imagesRoutes = require('./routes/images');
const feedbackRoutes = require('./routes/feedback');

const app = express();

const allowedOrigins = [
  'https://spotme-gym.vercel.app',   // expo web frontend
  'https://spotme-kdjd.vercel.app',  // admin panel
];
if (!isProduction) {
  allowedOrigins.push('http://localhost:19006', 'http://localhost:8081', 'http://localhost:5173', 'http://localhost:3000');
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

// Handle OPTIONS preflight for all routes before anything else
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SpotMe API is running smoothly!', time: new Date() })
});

app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/exercises', exercisesRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/daily', dailyRoutes);
app.use('/api/meals', mealsRoutes);
app.use('/api/water', waterRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/weight', weightRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/physique', physiqueRoutes);
app.use('/api/admin', adminRoutes);

const authenticateAdmin = require('./middleware/adminAuth');
app.use('/api/images', authenticateAdmin, imagesRoutes);
app.use('/api/feedback', feedbackRoutes);

// Global error-handling middleware
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: isProduction ? 'Internal server error' : err.message,
  });
});

const PORT = process.env.PORT || 5000;

if (!isProduction) {
  app.listen(PORT, '0.0.0.0', async () => {
    await initDB();
  });
} else {
  initDB().catch(err => console.error("DB Init Error:", err));
}

module.exports = app;
