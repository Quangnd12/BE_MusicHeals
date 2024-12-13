const express = require('express');
const router = express.Router();
const ArtistAlbumController = require('../controllers/artistAlbumController');
const artistAuthMiddleware = require('../middlewares/artistAuthMiddleware');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Không phải file ảnh! Vui lòng tải lên file ảnh.'), false);
    }
  },
});

router.post('/create', 
  artistAuthMiddleware,
  upload.single('cover_image'),
  ArtistAlbumController.createAlbum
);

router.post('/:album_id/songs',
  artistAuthMiddleware,
  ArtistAlbumController.addSongsToAlbum
);

router.get('/',
  artistAuthMiddleware,
  ArtistAlbumController.getArtistAlbums
);

router.get('/:album_id',
  artistAuthMiddleware,
  ArtistAlbumController.getAlbumDetails
);

router.put('/:album_id',
  artistAuthMiddleware,
  upload.single('cover_image'),
  ArtistAlbumController.updateAlbum
);

router.delete('/:album_id',
  artistAuthMiddleware,
  ArtistAlbumController.deleteAlbum
);

router.delete('/:album_id/songs/:song_id',
  artistAuthMiddleware,
  ArtistAlbumController.removeSongFromAlbum
);

module.exports = router;