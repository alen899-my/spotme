require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');

const isProduction = process.env.NODE_ENV === 'production';
const DEPLOY_TARGET = (process.env.DEPLOY_TARGET || (process.env.VERCEL ? 'vercel' : (isProduction ? 'aws' : 'local'))).toLowerCase();

// Feature Routes
const authRoutes = require('./features/auth/auth.routes');
const onboardingRoutes = require('./features/onboarding/onboarding.routes');
const profileRoutes = require('./features/profile/profile.routes');
const exercisesRoutes = require('./features/exercises/exercises.routes');
const workoutRoutes = require('./features/workouts/workouts.routes');
const dailyRoutes = require('./features/daily/daily.routes');
const mealsRoutes = require('./features/meals/meals.routes');
const waterRoutes = require('./features/water/water.routes');
const leaderboardRoutes = require('./features/leaderboard/leaderboard.routes');
const weightRoutes = require('./features/weight/weight.routes');
const notificationRoutes = require('./features/notifications/notifications.routes');
const physiqueRoutes = require('./features/physique/physique.routes');
const adminRoutes = require('./features/admin/admin.routes');
const imagesRoutes = require('./features/images/images.routes');
const feedbackRoutes = require('./features/feedback/feedback.routes');
const fileReplacerRoutes = require('./features/file-replacer/file-replacer.routes');
const aiRoutes = require('./features/ai/ai.routes');
const updatesRoutes = require('./features/updates/updates.routes');
const { telemetryMiddleware } = require('./features/monitoring/monitoring.collector');
const monitoringRoutes = require('./features/monitoring/monitoring.routes');

const app = express();

const allowedOrigins = [
  'https://spotme-gym.vercel.app',   // expo web
  'https://spotme-kdjd.vercel.app',  // admin panel
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
if (process.env.ADMIN_URL) {
  allowedOrigins.push(process.env.ADMIN_URL);
}
if (!isProduction) {
  allowedOrigins.push('http://localhost:19006', 'http://localhost:8081','http://localhost:8082', 'http://localhost:5173', 'http://localhost:3000');
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
app.use(telemetryMiddleware);

// Status & Health Routes
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SpotMe API',
    target: DEPLOY_TARGET,
    time: new Date()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SpotMe API',
    target: DEPLOY_TARGET,
    message: 'SpotMe API is running smoothly!',
    time: new Date()
  });
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
app.use('/api/admin/monitoring', monitoringRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/updates', updatesRoutes);

const authenticateAdmin = require('./middleware/adminAuth');
app.use('/api/images', authenticateAdmin, imagesRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin/file-replacer', fileReplacerRoutes);

// Global error-handling middleware
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: isProduction ? 'Internal server error' : err.message,
  });
});

const PORT = process.env.PORT || 5000;

// Determine whether the server should actively listen on a port:
// - Standalone servers (AWS EC2 / PM2, local dev) MUST call app.listen()
// - Serverless environments (Vercel) export the app directly
const shouldListen = DEPLOY_TARGET === 'aws' || DEPLOY_TARGET === 'local' || (!process.env.VERCEL && DEPLOY_TARGET !== 'vercel');

if (shouldListen) {
  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 [${DEPLOY_TARGET.toUpperCase()}] SpotMe backend running on port ${PORT}`);
    try {
      await initDB();
    } catch (err) {
      console.error("DB Init Error:", err);
    }
  });
} else {
  // Vercel serverless mode
  initDB().catch(err => console.error("DB Init Error:", err));
}

module.exports = app;
