const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// GET CURRENT USER
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const userQuery = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userQuery.rows[0];
    delete user.password;
    res.json(user);
  } catch (error) {
    console.error("Auth /me error:", error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

// Validation Schemas
const signupSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers and underscores"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  dob: z.string().optional(),
  gender: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// CHECK USERNAME AVAILABILITY
router.get('/check-username', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ message: 'Username is required' });
  const exists = await pool.query('SELECT id FROM users WHERE username = $1', [username.toLowerCase()]);
  res.json({ available: exists.rows.length === 0 });
});

// SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const validatedData = signupSchema.parse(req.body);
    const { fullName, username, email, password, dob, gender } = validatedData;
    const normalizedUsername = username.toLowerCase();

    // Check if email exists
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Check if username is taken
    const usernameExists = await pool.query('SELECT id FROM users WHERE username = $1', [normalizedUsername]);
    if (usernameExists.rows.length > 0) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const newUser = await pool.query(
      'INSERT INTO users (full_name, username, email, password, dob, gender) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, full_name, username, email',
      [fullName, normalizedUsername, email, hashedPassword, dob, gender]
    );

    const user = newUser.rows[0];

    // Create token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Send full user (minus password)
    const fullUser = { ...user };
    delete fullUser.password;

    res.status(201).json({ token, user: fullUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    // Check user
    const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userQuery.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = userQuery.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const fullUser = { ...user };
    delete fullUser.password;

    res.json({
      token,
      user: fullUser
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/update-profile', async (req, res) => {
  try {
    const {
      userId, age, height, weight, bodyFat,
      fitnessGoal, experienceLevel, activityLevel,
      neck, waist, hip, chest, arm, thigh,
      medicalConditions, medication, allergies,
      dietType, foodPreference, waterIntake, foodAllergies,
      full_name, email, gender, dob
    } = req.body;

    if (!userId) return res.status(400).json({ error: "User ID required" });

    const parsedUserId = parseInt(userId);
    if (isNaN(parsedUserId)) return res.status(400).json({ error: "Invalid User ID format" });

    const result = await pool.query(`
      UPDATE users SET
        age = $1, height = $2, weight = $3, body_fat = $4,
        fitness_goal = $5, experience_level = $6, activity_level = $7,
        neck = $8, waist = $9, hip = $10, chest = $11, arm = $12, thigh = $13,
        medical_conditions = $14, medication = $15, allergies = $16,
        diet_type = $17, food_preference = $18, water_intake = $19, food_allergies = $20,
        full_name = COALESCE($21, full_name), email = COALESCE($22, email), gender = $23, dob = COALESCE($25, dob)
      WHERE id = $24
    `, [
      age || null, height || null, weight || null, bodyFat || null,
      fitnessGoal || null, experienceLevel || null, activityLevel || null,
      neck || null, waist || null, hip || null, chest || null, arm || null, thigh || null,
      medicalConditions || null, medication || null, allergies || null,
      dietType || null, foodPreference || null, waterIntake || null, foodAllergies || null,
      full_name || null, email || null, gender || null,
      parsedUserId,
      dob || null
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found or profile not updated" });
    }

    res.json({ success: true, message: "Profile updated" });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// DELETE ACCOUNT
router.post('/delete-account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;
