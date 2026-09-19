const express = require('express');
const router = express.Router();
const upload = require('../../utils/upload');
const onboardingController = require('./onboarding.controller');

router.post('/complete', upload.fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'frontPhoto', maxCount: 1 },
  { name: 'backPhoto', maxCount: 1 },
  { name: 'sidePhoto', maxCount: 1 },
]), onboardingController.completeOnboarding);

module.exports = router;
