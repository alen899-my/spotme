'use strict';

const adminService = require('./admin.service');

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

async function createBuild(req, res) {
  try {
    const { title, description, build_channel, version, version_code, force_update } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });
    if (!adminService.BUILD_CHANNELS.includes(build_channel)) {
      return res.status(400).json({ message: 'build_channel must be production, preview or development' });
    }
    if (!req.file) return res.status(400).json({ message: 'Build file (.apk or .aab) is required' });

    const build = await adminService.createBuild({
      title,
      description,
      build_channel,
      version,
      version_code,
      force_update,
      file: req.file,
    });
    res.status(201).json({ success: true, build });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error('Admin create build error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function updateBuild(req, res) {
  try {
    const { id } = req.params;
    const { title, description, build_channel, version, version_code, force_update } = req.body;

    const build = await adminService.updateBuild(id, {
      title,
      description,
      build_channel,
      version,
      version_code,
      force_update,
      file: req.file,
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
    res.status(500).json({ message: 'Server error' });
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
  createBuild,
  updateBuild,
  deleteBuild,
  makeListEntityHandler,
  makeGetEntityHandler,
  makeCreateEntityHandler,
  makeUpdateEntityHandler,
  makeDeleteEntityHandler,
};
