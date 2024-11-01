const express = require('express');
const router = express.Router();
const albumController = require('../controllers/albumController');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

// Routes cho album
router.get('/', albumController.getAllAlbums);
router.get('/:id', albumController.getAlbumById);
router.post('/', upload.single('image'), albumController.createAlbum); // Tạo album mới và upload hình
router.put('/:id', upload.single('image'), albumController.updateAlbum); // Cập nhật album
router.delete('/:id', albumController.deleteAlbum);
module.exports = router;
