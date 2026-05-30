const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const upload = require('../uploadConfig');

router.post('/complete', upload.fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'frontPhoto', maxCount: 1 },
  { name: 'backPhoto', maxCount: 1 },
  { name: 'sidePhoto', maxCount: 1 },
]), async (req, res) => {
  try {
    const userId = req.body.userId;
    if (!userId) {
      return res.status(401).json({ error: "Missing userId" });
    }

    // Process image URLs if files were uploaded
    const getFileUrl = (fieldname) => {
      if (req.files && req.files[fieldname] && req.files[fieldname].length > 0) {
        return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${req.files[fieldname][0].key}`;
      }
      return null;
    };

    const profilePicUrl = getFileUrl('profilePic');
    const frontPhotoUrl = getFileUrl('frontPhoto');
    const backPhotoUrl = getFileUrl('backPhoto');
    const sidePhotoUrl = getFileUrl('sidePhoto');

    const {
      dob, age, height, weight, bodyFat,
      fitnessGoal, experienceLevel, activityLevel,
      neck, waist, hip, chest, arm, thigh,
      medicalConditions, medication, allergies,
      dietType, foodPreference, waterIntake, foodAllergies
    } = req.body;

    // "if every step completed eveu fields added only set it to yes"
    // Optional fields: bodyFat, measurements, health conditions.
    // Required fields based on UI: age/dob, height, weight, fitnessGoal, expLevel, activityLevel, diet, foodPref, waterIntake, all 4 photos.
    const isCompleted = !!(
      (dob || age) && height && weight &&
      fitnessGoal && experienceLevel && activityLevel &&
      dietType && foodPreference && waterIntake &&
      profilePicUrl && frontPhotoUrl && backPhotoUrl && sidePhotoUrl
    );

    await pool.query(`
      UPDATE users SET
        age = $1, height = $2, weight = $3, body_fat = $4,
        fitness_goal = $5, experience_level = $6, activity_level = $7,
        neck = $8, waist = $9, hip = $10, chest = $11, arm = $12, thigh = $13,
        medical_conditions = $14, medication = $15, allergies = $16,
        diet_type = $17, food_preference = $18, water_intake = $19, food_allergies = $20,
        profile_pic_url = COALESCE($21, profile_pic_url),
        front_photo_url = COALESCE($22, front_photo_url),
        back_photo_url = COALESCE($23, back_photo_url),
        side_photo_url = COALESCE($24, side_photo_url),
        onboarding_completed = $25,
        dob = COALESCE($27, dob)
      WHERE id = $26
    `, [
      age || null, height || null, weight || null, bodyFat || null,
      fitnessGoal || null, experienceLevel || null, activityLevel || null,
      neck || null, waist || null, hip || null, chest || null, arm || null, thigh || null,
      medicalConditions || null, medication || null, allergies || null,
      dietType || null, foodPreference || null, waterIntake || null, foodAllergies || null,
      profilePicUrl, frontPhotoUrl, backPhotoUrl, sidePhotoUrl,
      isCompleted,
      userId,
      dob || null
    ]);

    res.json({ 
      success: true, 
      onboardingCompleted: isCompleted,
      message: "Profile updated successfully" 
    });

  } catch (err) {
    console.error("Onboarding upload error:", err);
    res.status(500).json({ error: "Failed to process onboarding data" });
  }
});

module.exports = router;
