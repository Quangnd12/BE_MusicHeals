const express = require('express');
const followController = require('../controllers/followController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
// Thêm route mới để toggle follow
router.post(
  '/artists/:artistId/toggle-follow',
  authMiddleware.authMiddleware,
  followController.toggleFollowArtist
);
// Route để lấy danh sách nghệ sĩ có nhiều follow nhất
router.get(
  '/top-followed-artists',
  authMiddleware.authMiddleware,
  followController.getTopFollowedArtists
);

// Route để lấy danh sách follower của một nghệ sĩ cụ thể
router.get(
  '/artists/:artistId/followers',
  followController.getArtistFollowers
);

// Lấy thống kê follow
router.get(
  '/statistics',
  authMiddleware.authMiddleware,
  followController.getFollowStatistics
);

router.get(
  '/my-followed-artists',
  authMiddleware.authMiddleware,
  followController.getUserFollowedArtists
);


module.exports = router;