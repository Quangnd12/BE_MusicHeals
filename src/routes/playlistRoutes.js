const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const auth = require('../middlewares/authMiddleware'); // Assuming you have auth middleware

router.post('/', auth, playlistController.createPlaylist);
router.post('/:playlistId/songs', auth, playlistController.addSongToPlaylist);
router.get('/:playlistId', playlistController.getPlaylistDetails);
router.delete('/:playlistId/songs/:songId', auth, playlistController.removeSongFromPlaylist);

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