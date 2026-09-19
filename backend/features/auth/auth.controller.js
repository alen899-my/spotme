const jwt = require('jsonwebtoken');
const { z } = require('zod');
const authService = require('./auth.service');

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

/**
 * Controller to get current authenticated user.
 */
async function me(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await authService.getCurrentUser(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    console.error("Auth /me error:", error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

/**
 * Controller to check if username is available.
 */
async function checkUsername(req, res) {
  const { username } = req.query;
  if (!username) return res.status(400).json({ message: 'Username is required' });

  try {
    const available = await authService.checkUsernameAvailability(username);
    return res.json({ available });
  } catch (err) {
    console.error("Check username error:", err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Controller for user signup.
 */
async function signup(req, res) {
  try {
    const validatedData = signupSchema.parse(req.body);
    const result = await authService.registerUser(validatedData);
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    if (error.status === 400) {
      return res.status(400).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Controller for user login.
 */
async function login(req, res) {
  try {
    const validatedData = loginSchema.parse(req.body);
    const result = await authService.loginUser(validatedData);
    return res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    if (error.status === 400) {
      return res.status(400).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Controller to update profile during auth onboarding flow.
 */
async function updateProfile(req, res) {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const parsedUserId = parseInt(userId);
    if (isNaN(parsedUserId)) return res.status(400).json({ error: "Invalid User ID format" });

    const updated = await authService.updateProfile({
      ...req.body,
      userId: parsedUserId,
    });

    if (!updated) {
      return res.status(404).json({ error: "User not found or profile not updated" });
    }

    return res.json({ success: true, message: "Profile updated" });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ error: "Failed to update profile" });
  }
}

/**
 * Controller to request password reset code.
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const response = await authService.forgotPassword(email);
    return res.json(response);
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Failed to send reset email. Please try again.' });
  }
}

/**
 * Controller to verify reset code.
 */
async function verifyResetCode(req, res) {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and code are required' });
    }

    const result = await authService.verifyResetCode(email, code);
    return res.json(result);
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message });
    }
    console.error('Verify reset code error:', error);
    return res.status(500).json({ message: 'Failed to verify code. Please try again.' });
  }
}

/**
 * Controller to reset password.
 */
async function resetPassword(req, res) {
  try {
    const { resetToken, password } = req.body;
    if (!resetToken || !password) {
      return res.status(400).json({ message: 'Reset token and new password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const result = await authService.resetPassword(resetToken, password);
    return res.json(result);
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message });
    }
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Failed to reset password. Please try again.' });
  }
}

/**
 * Controller to change password for authenticated user.
 */
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    return res.json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error('Change password error:', error);
    return res.status(500).json({ message: 'Failed to change password. Please try again.' });
  }
}

/**
 * Controller to delete user account.
 */
async function deleteAccount(req, res) {
  try {
    const result = await authService.deleteAccount(req.user.id);
    return res.json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Delete account error:', err);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
}

module.exports = {
  signupSchema,
  loginSchema,
  me,
  checkUsername,
  signup,
  login,
  updateProfile,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  changePassword,
  deleteAccount,
};
