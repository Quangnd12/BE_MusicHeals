const express = require('express');
const router = express.Router();
const albumController = require('../controllers/albumController');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Giới hạn 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

// Routes cho album
router.get('/', albumController.getAllAlbums);
router.get('/:id', albumController.getAlbumById);
router.post('/', upload.single('image'), albumController.createAlbum); // Tạo album mới và upload hình
router.put('/:id', upload.single('image'), albumController.updateAlbum); // Cập nhật album
router.delete('/:id', albumController.deleteAlbum);
router.post('/:id/image', upload.single('image'), albumController.uploadAlbumImage)
module.exports = router;
