require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
const authRoutes = require('./routes/auth');
const onboardingRoutes = require('./routes/onboarding');
const profileRoutes = require('./routes/profile');

const app = express();

app.use(cors({
  origin: ['https://spotme-gym.vercel.app', 'http://localhost:19006', 'http://localhost:8081', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SpotMe API is running smoothly!', time: new Date() });
});

app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/profile', profileRoutes);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, async () => {
    await initDB();
    console.log(`Server running on port ${PORT}`);
  });
} else {
  // For Vercel/Production
  initDB().catch(err => console.error("DB Init Error:", err));
}

module.exports = app;
