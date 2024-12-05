const express = require('express');
const router = express.Router();
const ArtistSongController = require('../controllers/artistSongController');
const { verifyArtistToken } = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');

// Upload bài hát mới
router.post('/upload',
  verifyArtistToken,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'file_song', maxCount: 1 }
  ]),
  ArtistSongController.uploadSong
);

// Lấy danh sách bài hát của nghệ sĩ
router.get('/songs',
  verifyArtistToken,
  ArtistSongController.getArtistSongs
);

// Cập nhật bài hát
router.put('/songs/:id',
  verifyArtistToken,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'file_song', maxCount: 1 }
  ]),
  ArtistSongController.updateSong
);

// Xóa bài hát
router.delete('/songs/:id',
  verifyArtistToken,
  ArtistSongController.deleteSong
);

router.get('/genres-albums', verifyArtistToken, ArtistSongController.getGenresAndAlbums);

module.exports = router; 