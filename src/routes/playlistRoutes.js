// playlistRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const playlistController = require('../controllers/playlistController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Cấu hình multer đơn giản
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image file'), false);
        }
    }
});

// Public routes
router.get('/discover', playlistController.getPublicPlaylists);

// Protected routes
router.use(authMiddleware);

router.post('/', upload.fields([{ name: 'image', maxCount: 1 }]), playlistController.createPlaylist);
router.put('/:id', upload.fields([{ name: 'image', maxCount: 1 }]), playlistController.updatePlaylist);
router.delete('/:id', playlistController.deletePlaylist);
router.get('/:id', playlistController.getPlaylistById);
router.get('/user/me', playlistController.getUserPlaylists);
router.post('/songs/add', playlistController.addSongToPlaylist);
router.delete('/:playlistId/songs/:songId', playlistController.removeSongFromPlaylist);

module.exports = router;