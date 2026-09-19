const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/auth');
const authController = require('./auth.controller');

// GET CURRENT USER
router.get('/me', authController.me);

// CHECK USERNAME AVAILABILITY
router.get('/check-username', authController.checkUsername);

// SIGNUP
router.post('/signup', authController.signup);

// LOGIN
router.post('/login', authController.login);

// UPDATE PROFILE (onboarding)
router.post('/update-profile', authController.updateProfile);

// FORGOT PASSWORD
router.post('/forgot-password', authController.forgotPassword);

// VERIFY RESET CODE
router.post('/verify-reset-code', authController.verifyResetCode);

// RESET PASSWORD
router.post('/reset-password', authController.resetPassword);

// CHANGE PASSWORD
router.post('/change-password', authenticateToken, authController.changePassword);

// DELETE ACCOUNT
router.post('/delete-account', authenticateToken, authController.deleteAccount);

module.exports = router;
