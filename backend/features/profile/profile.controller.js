const profileService = require('./profile.service');

/**
 * Controller to get own profile.
 */
async function getProfile(req, res) {
  try {
    const user = await profileService.getOwnProfile(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(user);
  } catch (error) {
    console.error("GET /profile error:", error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Controller to update profile.
 */
async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    let updates = { ...req.body };

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

    const user = await profileService.updateProfile(userId, updates);
    return res.json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message });
    }
    console.error("PUT /profile/update error:", error);
    return res.status(500).json({ message: 'Failed to update profile' });
  }
}

/**
 * Controller to get follow status with target user.
 */
async function getFollowStatus(req, res) {
  try {
    const targetId = parseInt(req.params.id);
    const currentUserId = req.user.id;
    const status = await profileService.getFollowStatus(currentUserId, targetId);
    const isFollowingBack = await profileService.getFollowStatus(targetId, currentUserId);
    return res.json({ status, is_following_back: isFollowingBack === 'accepted' });
  } catch (error) {
    console.error("GET /profile/:id/follow-status error:", error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Controller to follow target user.
 */
async function followUser(req, res) {
  try {
    const targetId = parseInt(req.params.id);
    const result = await profileService.followUser(req.user.id, targetId);
    return res.json({ success: true, status: result.status });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("POST /profile/:id/follow error:", error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Controller to unfollow target user.
 */
async function unfollowUser(req, res) {
  try {
    const targetId = parseInt(req.params.id);
    await profileService.unfollowUser(req.user.id, targetId);
    return res.json({ success: true });
  } catch (error) {
    console.error("POST /profile/:id/unfollow error:", error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Controller to accept follow request.
 */
async function acceptFollow(req, res) {
  try {
    const targetId = parseInt(req.params.id);
    const accepted = await profileService.acceptFollowRequest(req.user.id, targetId);
    if (!accepted) {
      return res.status(404).json({ message: 'No pending follow request found' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error("POST /profile/:id/accept-follow error:", error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Controller to deny follow request.
 */
async function denyFollow(req, res) {
  try {
    const targetId = parseInt(req.params.id);
    await profileService.denyFollowRequest(req.user.id, targetId);
    return res.json({ success: true });
  } catch (error) {
    console.error("POST /profile/:id/deny-follow error:", error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Controller to get current authenticated user basic me.
 */
async function getMe(req, res) {
  try {
    const user = await profileService.getMe(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json(user);
  } catch (error) {
    console.error("GET /profile/me error:", error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Controller to export user data (GDPR).
 */
async function exportData(req, res) {
  try {
    const data = await profileService.exportUserData(req.user.id);
    if (!data) return res.status(404).json({ message: 'User not found' });
    return res.json(data);
  } catch (error) {
    console.error("GET /profile/export-data error:", error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Controller to get public profile with privacy check.
 */
async function getPublicProfile(req, res) {
  try {
    const targetId = parseInt(req.params.id);
    if (isNaN(targetId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const data = await profileService.getPublicProfile(targetId, req.user.id, req.query.limit);
    if (!data) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(data);
  } catch (error) {
    console.error("GET /profile/:id error:", error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Controller to remove follower.
 */
async function removeFollower(req, res) {
  try {
    const targetId = parseInt(req.params.id);
    const removed = await profileService.removeFollower(req.user.id, targetId);
    if (!removed) {
      return res.status(404).json({ message: 'Follower not found' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error("POST /profile/:id/remove-follower error:", error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Controller to get followers list.
 */
async function getFollowers(req, res) {
  try {
    const targetId = parseInt(req.params.id);
    if (isNaN(targetId)) return res.status(400).json({ message: 'Invalid user ID' });

    const users = await profileService.getFollowers(targetId, req.user.id);
    return res.json({ users });
  } catch (error) {
    console.error("GET /profile/:id/followers error:", error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Controller to get following list.
 */
async function getFollowing(req, res) {
  try {
    const targetId = parseInt(req.params.id);
    if (isNaN(targetId)) return res.status(400).json({ message: 'Invalid user ID' });

    const users = await profileService.getFollowing(targetId, req.user.id);
    return res.json({ users });
  } catch (error) {
    console.error("GET /profile/:id/following error:", error);
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getFollowStatus,
  followUser,
  unfollowUser,
  acceptFollow,
  denyFollow,
  getMe,
  exportData,
  getPublicProfile,
  removeFollower,
  getFollowers,
  getFollowing,
};
