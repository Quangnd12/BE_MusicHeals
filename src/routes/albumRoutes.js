// albumRoutes.js
const express = require('express');
const router = express.Router();
const albumController = require('../controllers/albumController');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

// Routes cơ bản
router.get('/', albumController.getAllAlbums);
router.get('/:id', albumController.getAlbumById);
router.post('/', upload.single('image'), albumController.createAlbum);
router.put('/:id', upload.single('image'), albumController.updateAlbum);
router.delete('/:id', albumController.deleteAlbum);

router.get('/search/title', albumController.searchAlbums);  // Đổi route để tránh conflict
router.get('/list/this-month', albumController.getThisMonthAlbums);

module.exports = router;