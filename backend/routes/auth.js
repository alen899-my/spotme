const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
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
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '365d' });

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
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '365d' });

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
      full_name, email, gender, dob, completedSteps
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
        full_name = COALESCE($21, full_name), email = COALESCE($22, email), gender = $23, dob = COALESCE($25, dob),
        completed_steps = COALESCE($26, completed_steps)
      WHERE id = $24
    `, [
      age || null, height || null, weight || null, bodyFat || null,
      fitnessGoal || null, experienceLevel || null, activityLevel || null,
      neck || null, waist || null, hip || null, chest || null, arm || null, thigh || null,
      medicalConditions || null, medication || null, allergies || null,
      dietType || null, foodPreference || null, waterIntake || null, foodAllergies || null,
      full_name || null, email || null, gender || null,
      parsedUserId,
      dob || null,
      completedSteps ? JSON.stringify(completedSteps) : null
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

// FORGOT PASSWORD — send 6-digit code
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const userQuery = await pool.query('SELECT id, full_name FROM users WHERE email = $1', [email]);
    if (userQuery.rows.length === 0) {
      return res.status(200).json({ message: 'If an account with that email exists, a code has been sent.' });
    }

    const user = userQuery.rows[0];
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, code, expiresAt]
    );

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"SpotMe" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Your SpotMe password reset code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #2596BE;">SpotMe</h2>
          <p>Hi ${user.full_name || 'there'},</p>
          <p>Use the code below to reset your SpotMe password. It expires in 15 minutes.</p>
          <div style="background: #f4f4f4; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #2596BE;">${code}</span>
          </div>
          <p style="color: #888; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: 'If an account with that email exists, a code has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to send reset email. Please try again.' });
  }
});

// VERIFY RESET CODE — returns short-lived JWT
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and code are required' });
    }

    const userQuery = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userQuery.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    const userId = userQuery.rows[0].id;
    const tokenQuery = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE user_id = $1 AND token = $2 AND used = FALSE AND expires_at > NOW()',
      [userId, code]
    );

    if (tokenQuery.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    const resetEntry = tokenQuery.rows[0];
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [resetEntry.id]);

    const resetToken = jwt.sign(
      { id: userId, purpose: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ resetToken });
  } catch (error) {
    console.error('Verify reset code error:', error);
    res.status(500).json({ message: 'Failed to verify code. Please try again.' });
  }
});

// RESET PASSWORD — accepts JWT + new password
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, password } = req.body;
    if (!resetToken || !password) {
      return res.status(400).json({ message: 'Reset token and new password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: 'Invalid or expired reset session. Please request a new code.' });
    }

    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, decoded.id]);

    res.json({ message: 'Password reset successful. You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password. Please try again.' });
  }
});

// CHANGE PASSWORD
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const userQuery = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, userQuery.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password. Please try again.' });
  }
});

// DELETE ACCOUNT
router.post('/delete-account', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;

    await client.query('BEGIN');

    // Manually clean up records that could cause FK conflicts in cascade chain
    // global_exercise_prs: nullify references before cascading deletes
    await client.query(
      'UPDATE global_exercise_prs SET user_id = NULL, daily_workout_id = NULL, daily_exercise_id = NULL WHERE user_id = $1',
      [userId]
    );
    // user_exercise_prs: delete instead of relying on cascade + set null overlap
    await client.query('DELETE FROM user_exercise_prs WHERE user_id = $1', [userId]);
    // Delete user's workouts explicitly to control cascade order
    await client.query('DELETE FROM daily_workouts WHERE user_id = $1', [userId]);

    const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  } finally {
    client.release();
  }
});

module.exports = router;
