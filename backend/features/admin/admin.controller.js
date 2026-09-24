'use strict';

const adminService = require('./admin.service');
const workoutAnalyticsService = require('./admin-workout-analytics.service');
const nutritionAnalyticsService = require('./admin-nutrition-analytics.service');

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const auth = await adminService.adminLogin({ email, password });
    if (!auth) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json(auth);
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getMe(req, res) {
  try {
    const admin = await adminService.getAdminMe(req.admin.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.json(admin);
  } catch (error) {
    console.error('Admin me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getDashboard(req, res) {
  try {
    const stats = await adminService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

// ─── Users ───────────────────────────────────────────────────────────────────
async function listUsers(req, res) {
  try {
    const { page = 1, limit = 20, search, sortBy, sortOrder } = req.query;
    const result = await adminService.listUsers({ page, limit, search, sortBy, sortOrder });
    res.json(result);
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getUser(req, res) {
  try {
    const user = await adminService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function updateUser(req, res) {
  try {
    const user = await adminService.updateUser(req.params.id, req.body);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function deleteUser(req, res) {
  try {
    const deleted = await adminService.deleteUser(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

// ─── Feedback ────────────────────────────────────────────────────────────────
async function listFeedback(req, res) {
  try {
    const { page = 1, limit = 20, search, sortBy, sortOrder } = req.query;
    const result = await adminService.listFeedback({ page, limit, search, sortBy, sortOrder });
    res.json(result);
  } catch (error) {
    console.error('Admin list feedback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function deleteFeedback(req, res) {
  try {
    const deleted = await adminService.deleteFeedback(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    res.json({ message: 'Feedback deleted' });
  } catch (error) {
    console.error('Admin delete feedback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

// ─── Active Users ────────────────────────────────────────────────────────────
async function getActiveUsers(req, res) {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const result = await adminService.getActiveUsers({ page, limit, search });
    res.json(result);
  } catch (error) {
    console.error('Admin active users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

// ─── Exercises ───────────────────────────────────────────────────────────────
async function createExercise(req, res) {
  try {
    const exercise = await adminService.createExercise({ body: req.body, files: req.files });
    res.status(201).json({ success: true, exercise });
  } catch (error) {
    console.error('Admin create exercise error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function updateExercise(req, res) {
  try {
    const exercise = await adminService.updateExercise(req.params.id, { body: req.body, files: req.files });
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }
    res.json({ success: true, exercise });
  } catch (error) {
    console.error('Admin update exercise error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

// ─── Workout Splits ──────────────────────────────────────────────────────────
async function listSplits(req, res) {
  try {
    const { page = 1, limit = 20, search, sortBy, sortOrder } = req.query;
    const result = await adminService.listSplits({ page, limit, search, sortBy, sortOrder });
    res.json(result);
  } catch (error) {
    console.error('Admin list splits error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getSplit(req, res) {
  try {
    const split = await adminService.getSplitById(req.params.id);
    if (!split) {
      return res.status(404).json({ message: 'Split not found' });
    }
    res.json(split);
  } catch (error) {
    console.error('Admin get split error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function createSplit(req, res) {
  const { name, description, sessions } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Name is required' });
  }

  try {
    const split = await adminService.createSplit({ name, description, sessions });
    res.status(201).json(split);
  } catch (error) {
    console.error('Admin create split error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function updateSplit(req, res) {
  const { name, description, sessions } = req.body;

  try {
    const split = await adminService.updateSplit(req.params.id, { name, description, sessions });
    if (!split) {
      return res.status(404).json({ message: 'Split not found' });
    }
    res.json(split);
  } catch (error) {
    console.error('Admin update split error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function deleteSplit(req, res) {
  try {
    const deleted = await adminService.deleteSplit(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Split not found' });
    }
    res.json({ message: 'Split deleted' });
  } catch (error) {
    console.error('Admin delete split error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

// ─── Builds ──────────────────────────────────────────────────────────────────
async function listBuilds(req, res) {
  try {
    const { page = 1, limit = 50, search, sortBy, sortOrder } = req.query;
    const result = await adminService.listBuilds({ page, limit, search, sortBy, sortOrder });
    res.json(result);
  } catch (error) {
    console.error('Admin list builds error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getBuild(req, res) {
  try {
    const build = await adminService.getBuildById(req.params.id);
    if (!build) {
      return res.status(404).json({ message: 'Build not found' });
    }
    res.json({ build });
  } catch (error) {
    console.error('Admin get build error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getBuildPresignedUrl(req, res) {
  try {
    const { filename, fileType, fileSize } = req.body;
    if (!filename) {
      return res.status(400).json({ message: 'Filename is required' });
    }

    const ext = (filename.split('.').pop() || '').toLowerCase();
    if (!['apk', 'aab'].includes(ext)) {
      return res.status(400).json({ message: 'Only .apk and .aab files are allowed' });
    }

    if (fileSize && fileSize > 1024 * 1024 * 1024) { // 1GB
      return res.status(400).json({ message: 'File exceeds 1 GB limit' });
    }

    const { s3 } = require('../../utils/upload');
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

    const key = `spotme/builds/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const contentType = fileType || (ext === 'apk'
      ? 'application/vnd.android.package-archive'
      : 'application/octet-stream');

    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 7200 }); // 2 hours
    const fileUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;

    res.json({
      uploadUrl,
      fileKey: key,
      fileUrl,
      fileType: ext,
    });
  } catch (error) {
    console.error('Admin getBuildPresignedUrl error:', error);
    res.status(500).json({ message: 'Failed to generate upload URL' });
  }
}

async function createBuild(req, res) {
  try {
    const {
      title,
      description,
      build_channel,
      version,
      version_code,
      force_update,
      file_key,
      file_url,
      file_size,
      file_type,
    } = req.body;

    if (!title) return res.status(400).json({ message: 'Title is required' });
    if (!adminService.BUILD_CHANNELS.includes(build_channel)) {
      return res.status(400).json({ message: 'build_channel must be production, preview or development' });
    }
    if (!req.file && !file_key) {
      return res.status(400).json({ message: 'Build file (.apk or .aab) is required' });
    }

    const build = await adminService.createBuild({
      title,
      description,
      build_channel,
      version,
      version_code,
      force_update,
      file: req.file,
      file_key,
      file_url,
      file_size,
      file_type,
    });
    res.status(201).json({ success: true, build });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error('Admin create build error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
}

async function updateBuild(req, res) {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      build_channel,
      version,
      version_code,
      force_update,
      file_key,
      file_url,
      file_size,
      file_type,
    } = req.body;

    const build = await adminService.updateBuild(id, {
      title,
      description,
      build_channel,
      version,
      version_code,
      force_update,
      file: req.file,
      file_key,
      file_url,
      file_size,
      file_type,
    });
    if (!build) {
      return res.status(404).json({ message: 'Build not found' });
    }
    res.json({ success: true, build });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error('Admin update build error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
}

async function deleteBuild(req, res) {
  try {
    const deleted = await adminService.deleteBuild(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Build not found' });
    }
    res.json({ message: 'Build deleted' });
  } catch (error) {
    console.error('Admin delete build error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

// ─── Entity Factory Handlers ─────────────────────────────────────────────────
function makeListEntityHandler(table, entityName) {
  const listName = entityName.replace(/-/g, '_');
  return async (req, res) => {
    try {
      const { page = 1, limit = 50, search, sortBy, sortOrder } = req.query;
      const { rows, total } = await adminService.listEntities(table, { page, limit, search, sortBy, sortOrder });
      res.json({ [listName]: rows, total });
    } catch (error) {
      console.error(`Admin list ${entityName} error:`, error);
      res.status(500).json({ message: 'Server error' });
    }
  };
}

function makeGetEntityHandler(table, entityName) {
  return async (req, res) => {
    try {
      const entity = await adminService.getEntityById(table, req.params.id);
      if (!entity) {
        return res.status(404).json({ message: `${entityName} not found` });
      }
      res.json(entity);
    } catch (error) {
      console.error(`Admin get ${entityName} error:`, error);
      res.status(500).json({ message: 'Server error' });
    }
  };
}

function makeCreateEntityHandler(table, entityName) {
  return async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ message: 'Name is required' });

      const entity = await adminService.createEntity(table, { name, file: req.file });
      res.status(201).json({ success: true, [entityName]: entity });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ message: `${entityName} already exists` });
      }
      console.error(`Admin create ${entityName} error:`, error);
      res.status(500).json({ message: 'Server error' });
    }
  };
}

function makeUpdateEntityHandler(table, entityName) {
  return async (req, res) => {
    try {
      const { id } = req.params;
      const { name, remove_image } = req.body;

      const entity = await adminService.updateEntity(table, id, {
        name,
        file: req.file,
        remove_image,
      });
      if (!entity) {
        return res.status(404).json({ message: `${entityName} not found` });
      }

      res.json({ success: true, [entityName]: entity });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ message: `${entityName} name already exists` });
      }
      console.error(`Admin update ${entityName} error:`, error);
      res.status(500).json({ message: 'Server error' });
    }
  };
}

function makeDeleteEntityHandler(table, entityName) {
  return async (req, res) => {
    try {
      const deleted = await adminService.deleteEntity(table, req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: `${entityName} not found` });
      }
      res.json({ message: `${entityName} deleted` });
    } catch (error) {
      console.error(`Admin delete ${entityName} error:`, error);
      res.status(500).json({ message: 'Server error' });
    }
  };
}

// ─── Nutrition / Food Database ────────────────────────────────────────────────
async function listFoods(req, res) {
  try {
    const { page = 1, limit = 30, search, category } = req.query;
    const data = await adminService.listFoodItems({ page, limit, search, category });
    res.json(data);
  } catch (error) {
    console.error('Admin listFoods error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function createFood(req, res) {
  try {
    const item = await adminService.createFoodItem(req.body);
    res.status(201).json({ success: true, food: item });
  } catch (error) {
    console.error('Admin createFood error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function deleteFood(req, res) {
  try {
    await adminService.deleteFoodItem(req.params.id);
    res.json({ success: true, message: 'Food item deleted' });
  } catch (error) {
    console.error('Admin deleteFood error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function listMeals(req, res) {
  try {
    const { page = 1, limit = 30 } = req.query;
    const data = await adminService.listLoggedMeals({ page, limit });
    res.json(data);
  } catch (error) {
    console.error('Admin listMeals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

// ─── Physique Moderation ──────────────────────────────────────────────────────
async function listPhysique(req, res) {
  try {
    const { page = 1, limit = 30, status } = req.query;
    const data = await adminService.listPhysiqueAnalyses({ page, limit, status });
    res.json(data);
  } catch (error) {
    console.error('Admin listPhysique error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function updatePhysiqueStatus(req, res) {
  try {
    const { status } = req.body;
    const item = await adminService.updatePhysiqueStatus(req.params.id, status);
    res.json({ success: true, item });
  } catch (error) {
    console.error('Admin updatePhysiqueStatus error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function deletePhysique(req, res) {
  try {
    await adminService.deletePhysiqueAnalysis(req.params.id);
    res.json({ success: true, message: 'Physique entry removed' });
  } catch (error) {
    console.error('Admin deletePhysique error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

// ─── Push Notifications ───────────────────────────────────────────────────────
async function broadcastPush(req, res) {
  try {
    const { title, body, screen, targetAudience = 'all' } = req.body;
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required' });
    }
    const { sendBroadcastPush } = require('../../utils/pushNotifications');
    const result = await sendBroadcastPush({
      title,
      body,
      data: { screen: screen || 'home' },
      targetAudience,
    });
    res.json({ success: true, sentCount: result.count, message: `Dispatched to ${result.count} active devices` });
  } catch (error) {
    console.error('Admin broadcastPush error:', error);
    res.status(500).json({ message: 'Failed to send broadcast push notification' });
  }
}

async function listCampaigns(req, res) {
  try {
    const { page = 1, limit = 30 } = req.query;
    const data = await adminService.listNotificationHistory({ page, limit });
    res.json(data);
  } catch (error) {
    console.error('Admin listCampaigns error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

// ─── Workouts ─────────────────────────────────────────────────────────────────
async function listWorkouts(req, res) {
  try {
    const { page = 1, limit = 30 } = req.query;
    const data = await adminService.listWorkoutSessionsAdmin({ page, limit });
    res.json(data);
  } catch (error) {
    console.error('Admin listWorkouts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getWorkoutAnalytics(req, res) {
  try {
    const { userId, range, tz } = req.query;
    const data = await workoutAnalyticsService.getWorkoutAnalytics({ userId, range, tz });
    res.json(data);
  } catch (error) {
    console.error('Admin getWorkoutAnalytics error:', error);
    res.status(500).json({ message: 'Failed to retrieve workout analytics' });
  }
}

async function getAthleteExercises(req, res) {
  try {
    const { userId, search, bodyPart } = req.query;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }
    const data = await workoutAnalyticsService.getAthleteExercises({ userId, search, bodyPart });
    res.json(data);
  } catch (error) {
    console.error('Admin getAthleteExercises error:', error);
    res.status(500).json({ message: 'Failed to retrieve athlete exercises' });
  }
}

async function getAthleteExerciseProgression(req, res) {
  try {
    const { userId, exerciseId, range, tz, workoutTitle } = req.query;
    if (!userId || !exerciseId) {
      return res.status(400).json({ message: 'userId and exerciseId are required' });
    }
    const data = await workoutAnalyticsService.getAthleteExerciseProgression({
      userId,
      exerciseId,
      range,
      tz,
      workoutTitle,
    });
    res.json(data);
  } catch (error) {
    console.error('Admin getAthleteExerciseProgression error:', error);
    res.status(500).json({ message: 'Failed to retrieve exercise progression' });
  }
}

async function getNutritionAnalytics(req, res) {
  try {
    const { userId, range, tz } = req.query;
    const data = await nutritionAnalyticsService.getNutritionAnalytics({ userId, range, tz });
    res.json(data);
  } catch (error) {
    console.error('Admin getNutritionAnalytics error:', error);
    res.status(500).json({ message: 'Failed to retrieve nutrition analytics' });
  }
}

async function getRecentLoggedMeals(req, res) {
  try {
    const { userId, page, limit, mealType, minProtein, maxCalories, search, tz } = req.query;
    const data = await nutritionAnalyticsService.getRecentLoggedMeals({
      userId,
      page,
      limit,
      mealType,
      minProtein,
      maxCalories,
      search,
      tz,
    });
    res.json(data);
  } catch (error) {
    console.error('Admin getRecentLoggedMeals error:', error);
    res.status(500).json({ message: 'Failed to retrieve recent logged meals' });
  }
}

// ─── Phase 2 Controllers ──────────────────────────────────────────────────────
async function getOnboarding(req, res) {
  try {
    const data = await adminService.getOnboardingAnalytics();
    res.json(data);
  } catch (error) {
    console.error('Admin getOnboarding error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getHabits(req, res) {
  try {
    const data = await adminService.getHabitsAnalytics();
    res.json(data);
  } catch (error) {
    console.error('Admin getHabits error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getUser360(req, res) {
  try {
    const profile = await adminService.getUser360Profile(req.params.id);
    if (!profile) return res.status(404).json({ message: 'User not found' });
    res.json(profile);
  } catch (error) {
    console.error('Admin getUser360 error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

// ─── Phase 3: AI Intelligence, Remote Config & Gamification ──────────────────

async function getAiAnalytics(req, res) {
  try {
    const { sessionPage = 1, sessionLimit = 15, reportPage = 1, reportLimit = 10 } = req.query;
    const data = await adminService.getAiIntelligenceAnalytics({
      sessionPage: parseInt(sessionPage) || 1,
      sessionLimit: parseInt(sessionLimit) || 15,
      reportPage: parseInt(reportPage) || 1,
      reportLimit: parseInt(reportLimit) || 10,
    });
    res.json(data);
  } catch (error) {
    console.error('Admin getAiAnalytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getAiSessionDetails(req, res) {
  try {
    const data = await adminService.getAiSessionMessages(req.params.id);
    if (!data) return res.status(404).json({ message: 'Session not found' });
    res.json(data);
  } catch (error) {
    console.error('Admin getAiSessionDetails error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getRemoteConfig(req, res) {
  try {
    const data = await adminService.getRemoteConfig();
    res.json(data);
  } catch (error) {
    console.error('Admin getRemoteConfig error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function updateRemoteConfig(req, res) {
  try {
    const data = await adminService.updateRemoteConfig(req.body);
    res.json(data);
  } catch (error) {
    console.error('Admin updateRemoteConfig error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getGamification(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const data = await adminService.getGamificationAnalytics({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });
    res.json(data);
  } catch (error) {
    console.error('Admin getGamification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  login,
  getMe,
  getDashboard,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  listFeedback,
  deleteFeedback,
  getActiveUsers,
  createExercise,
  updateExercise,
  listSplits,
  getSplit,
  createSplit,
  updateSplit,
  deleteSplit,
  listBuilds,
  getBuild,
  getBuildPresignedUrl,
  createBuild,
  updateBuild,
  deleteBuild,
  makeListEntityHandler,
  makeGetEntityHandler,
  makeCreateEntityHandler,
  makeUpdateEntityHandler,
  makeDeleteEntityHandler,
  listFoods,
  createFood,
  deleteFood,
  listMeals,
  listPhysique,
  updatePhysiqueStatus,
  deletePhysique,
  broadcastPush,
  listCampaigns,
  listWorkouts,
  getWorkoutAnalytics,
  getAthleteExercises,
  getAthleteExerciseProgression,
  getNutritionAnalytics,
  getRecentLoggedMeals,
  getOnboarding,
  getHabits,
  getUser360,
  getAiAnalytics,
  getAiSessionDetails,
  getRemoteConfig,
  updateRemoteConfig,
  getGamification,
};
