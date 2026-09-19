const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { pool } = require('../../db');

/**
 * Get current user by token ID.
 */
async function getCurrentUser(userId) {
  const userQuery = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  if (userQuery.rows.length === 0) return null;
  const user = userQuery.rows[0];
  delete user.password;
  return user;
}

/**
 * Check if username is available.
 */
async function checkUsernameAvailability(username) {
  const exists = await pool.query('SELECT id FROM users WHERE username = $1', [username.toLowerCase()]);
  return exists.rows.length === 0;
}

/**
 * Register a new user.
 */
async function registerUser({ fullName, username, email, password, dob, gender }) {
  const normalizedUsername = username.toLowerCase();

  // Check if email exists
  const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (userExists.rows.length > 0) {
    const err = new Error('User already exists');
    err.status = 400;
    throw err;
  }

  // Check if username is taken
  const usernameExists = await pool.query('SELECT id FROM users WHERE username = $1', [normalizedUsername]);
  if (usernameExists.rows.length > 0) {
    const err = new Error('Username is already taken');
    err.status = 400;
    throw err;
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
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '365d' });

  const fullUser = { ...user };
  delete fullUser.password;

  return { token, user: fullUser };
}

/**
 * Login user with email & password.
 */
async function loginUser({ email, password }) {
  const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (userQuery.rows.length === 0) {
    const err = new Error('Invalid credentials');
    err.status = 400;
    throw err;
  }

  const user = userQuery.rows[0];
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const err = new Error('Invalid credentials');
    err.status = 400;
    throw err;
  }

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '365d' });
  const fullUser = { ...user };
  delete fullUser.password;

  return { token, user: fullUser };
}

/**
 * Update profile during auth flow.
 */
async function updateProfile(data) {
  const {
    userId, age, height, weight, bodyFat,
    fitnessGoal, experienceLevel, activityLevel,
    neck, waist, hip, chest, arm, thigh,
    medicalConditions, medication, allergies,
    dietType, foodPreference, waterIntake, foodAllergies,
    full_name, email, gender, dob, completedSteps
  } = data;

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
    userId,
    dob || null,
    completedSteps ? JSON.stringify(completedSteps) : null
  ]);

  return result.rowCount > 0;
}

/**
 * Request password reset code via email.
 */
async function forgotPassword(email) {
  const userQuery = await pool.query('SELECT id, full_name FROM users WHERE email = $1', [email]);
  if (userQuery.rows.length === 0) {
    return { message: 'If an account with that email exists, a code has been sent.' };
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

  return { message: 'If an account with that email exists, a code has been sent.' };
}

/**
 * Verify 6-digit password reset code.
 */
async function verifyResetCode(email, code) {
  const userQuery = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (userQuery.rows.length === 0) {
    const err = new Error('Invalid or expired code');
    err.status = 400;
    throw err;
  }

  const userId = userQuery.rows[0].id;
  const tokenQuery = await pool.query(
    'SELECT * FROM password_reset_tokens WHERE user_id = $1 AND token = $2 AND used = FALSE AND expires_at > NOW()',
    [userId, code]
  );

  if (tokenQuery.rows.length === 0) {
    const err = new Error('Invalid or expired code');
    err.status = 400;
    throw err;
  }

  const resetEntry = tokenQuery.rows[0];
  await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [resetEntry.id]);

  const resetToken = jwt.sign(
    { id: userId, purpose: 'password_reset' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  return { resetToken };
}

/**
 * Reset password using JWT resetToken.
 */
async function resetPassword(resetToken, password) {
  let decoded;
  try {
    decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch {
    const err = new Error('Invalid or expired reset session. Please request a new code.');
    err.status = 400;
    throw err;
  }

  if (decoded.purpose !== 'password_reset') {
    const err = new Error('Invalid reset token');
    err.status = 400;
    throw err;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, decoded.id]);
  return { message: 'Password reset successful. You can now log in with your new password.' };
}

/**
 * Change password for authenticated user.
 */
async function changePassword(userId, currentPassword, newPassword) {
  const userQuery = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
  if (userQuery.rows.length === 0) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const isMatch = await bcrypt.compare(currentPassword, userQuery.rows[0].password);
  if (!isMatch) {
    const err = new Error('Current password is incorrect');
    err.status = 400;
    throw err;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);
  await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);

  return { message: 'Password changed successfully' };
}

/**
 * Delete account and clean up references.
 */
async function deleteAccount(userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE global_exercise_prs SET user_id = NULL, daily_workout_id = NULL, daily_exercise_id = NULL WHERE user_id = $1',
      [userId]
    );
    await client.query('DELETE FROM user_exercise_prs WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM daily_workouts WHERE user_id = $1', [userId]);

    const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    await client.query('COMMIT');
    return { success: true, message: 'Account deleted successfully' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getCurrentUser,
  checkUsernameAvailability,
  registerUser,
  loginUser,
  updateProfile,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  changePassword,
  deleteAccount,
};
