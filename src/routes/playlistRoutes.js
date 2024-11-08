const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const { authenticateUser } = require('../middlewares/authMiddleware');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

// Add authenticateUser middleware to all playlist routes
router.use(authenticateUser);

router.get('/', playlistController.getAllPlaylists);
router.get('/:id', playlistController.getPlaylistById);
router.post('/', upload.single('image'), playlistController.createPlaylist);
router.put('/:id', upload.single('image'), playlistController.updatePlaylist);
router.delete('/:id', playlistController.deletePlaylist);

module.exports = router;
// POST /api/playlists
// {
//   "name": "My Favorite Songs",
//   "description": "A collection of my favorite songs",
//   "isPublic": true
// }

// // Add song to playlist
// POST /api/playlists/1/songs
// {
//   "songId": 1
// }

// // Get playlist details
// GET /api/playlists/1

// // Remove song from playlist
// DELETE /api/playlists/1/songs/1