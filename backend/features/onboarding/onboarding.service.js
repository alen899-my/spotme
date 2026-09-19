const { pool } = require('../../db');

/**
 * Updates user profile with onboarding data and determines if onboarding is complete.
 */
async function completeOnboarding({
  userId,
  dob, age, height, weight, bodyFat,
  fitnessGoal, experienceLevel, activityLevel,
  neck, waist, hip, chest, arm, thigh,
  medicalConditions, medication, allergies,
  dietType, foodPreference, waterIntake, foodAllergies,
  profilePicUrl, frontPhotoUrl, backPhotoUrl, sidePhotoUrl,
}) {
  const userQuery = await pool.query('SELECT profile_pic_url FROM users WHERE id = $1', [userId]);
  const existingProfilePic = userQuery.rows[0]?.profile_pic_url;

  const isCompleted = !!(
    (dob || age) && height && weight &&
    fitnessGoal && experienceLevel && activityLevel &&
    dietType && foodPreference && waterIntake &&
    (profilePicUrl || existingProfilePic)
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
    dob || null,
  ]);

  return { isCompleted };
}

module.exports = {
  completeOnboarding,
};
