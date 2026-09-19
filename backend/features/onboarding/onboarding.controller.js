const onboardingService = require('./onboarding.service');

/**
 * Controller to handle onboarding submission with file uploads.
 */
async function completeOnboarding(req, res) {
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
      dietType, foodPreference, waterIntake, foodAllergies,
    } = req.body;

    const result = await onboardingService.completeOnboarding({
      userId,
      dob, age, height, weight, bodyFat,
      fitnessGoal, experienceLevel, activityLevel,
      neck, waist, hip, chest, arm, thigh,
      medicalConditions, medication, allergies,
      dietType, foodPreference, waterIntake, foodAllergies,
      profilePicUrl, frontPhotoUrl, backPhotoUrl, sidePhotoUrl,
    });

    return res.json({
      success: true,
      onboardingCompleted: result.isCompleted,
      message: "Profile updated successfully",
    });
  } catch (err) {
    console.error("Onboarding upload error:", err);
    return res.status(500).json({ error: "Failed to process onboarding data" });
  }
}

module.exports = {
  completeOnboarding,
};
