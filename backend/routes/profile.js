const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const upload = require('../uploadConfig');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// GET PROFILE
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userQuery = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = userQuery.rows[0];
    delete user.password;
    res.json(user);
  } catch (error) {
    console.error("GET /profile error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE PROFILE
router.put('/update', authenticateToken, upload.fields([
  { name: 'profile_pic', maxCount: 1 },
  { name: 'front_photo', maxCount: 1 },
  { name: 'back_photo', maxCount: 1 },
  { name: 'side_photo', maxCount: 1 },
]), async (req, res) => {
  try {
    const userId = req.user.id;
    let updates = { ...req.body };

    // Process uploaded files if any
    if (req.files) {
      const getFileUrl = (fieldname) => {
        if (req.files[fieldname] && req.files[fieldname].length > 0) {
          return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${req.files[fieldname][0].key}`;
        }
        return null;
      };

      const profilePicUrl = getFileUrl('profile_pic');
      const frontPhotoUrl = getFileUrl('front_photo');
      const backPhotoUrl = getFileUrl('back_photo');
      const sidePhotoUrl = getFileUrl('side_photo');

      if (profilePicUrl) updates.profile_pic_url = profilePicUrl;
      if (frontPhotoUrl) updates.front_photo_url = frontPhotoUrl;
      if (backPhotoUrl) updates.back_photo_url = backPhotoUrl;
      if (sidePhotoUrl) updates.side_photo_url = sidePhotoUrl;
    }

    // List of allowed fields to update
    const allowedFields = [
      'full_name', 'email', 'phone_number', 'dob', 'gender',
      'age', 'height', 'weight', 'body_fat',
      'fitness_goal', 'experience_level', 'activity_level',
      'neck', 'waist', 'hip', 'chest', 'arm', 'thigh',
      'medical_conditions', 'medication', 'allergies',
      'diet_type', 'food_preference', 'water_intake', 'food_allergies',
      'profile_pic_url', 'front_photo_url', 'back_photo_url', 'side_photo_url'
    ];

    const fieldsToUpdate = [];
    const values = [];
    let queryIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fieldsToUpdate.push(`${field} = $${queryIndex}`);
        values.push(updates[field] === "" ? null : updates[field]);
        queryIndex++;
      }
    }

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ message: "No valid fields provided for update" });
    }

    values.push(userId);
    const query = `
      UPDATE users 
      SET ${fieldsToUpdate.join(', ')} 
      WHERE id = $${queryIndex} 
      RETURNING *
    `;

    const updatedUser = await pool.query(query, values);
    
    const user = updatedUser.rows[0];
    delete user.password;
    
    res.json({
      success: true,
      message: "Profile updated successfully",
      user: user
    });
  } catch (error) {
    console.error("PUT /profile/update error:", error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

module.exports = router;
