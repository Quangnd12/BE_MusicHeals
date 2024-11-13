
// playlistRoutes.js
const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Tất cả các routes đều yêu cầu xác thực
router.use(authMiddleware);

// Create a new playlist
router.post('/', playlistController.createPlaylist);

// Add song to playlist
router.post('/add-song', playlistController.addSongToPlaylist);

// Remove song from playlist
router.delete('/:playlistId/songs/:songId', playlistController.removeSongFromPlaylist);

// Get playlist by ID
router.get('/:id', playlistController.getPlaylistById);

// Get user's playlists
router.get('/user/me', playlistController.getUserPlaylists);

// Get public playlists
router.get('/public/all', playlistController.getPublicPlaylists);

// Update playlist
router.put('/:id', playlistController.updatePlaylist);

// Delete playlist
router.delete('/:id', playlistController.deletePlaylist);

module.exports = router;