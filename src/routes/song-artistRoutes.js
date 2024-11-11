const express = require('express');
const router = express.Router();
const songArtistController = require('../controllers/song-artistController');

router.get('/', songArtistController.getAllSongArtists); // Lấy tất cả song_artist với phân trang
router.get('/artist/:artistID', songArtistController.getSongArtistByArtistID); // Lấy song_artist theo artistID
router.get('/song/:songID', songArtistController.getSongArtistBySongID); // Lấy song_artist theo songID

module.exports = router;
