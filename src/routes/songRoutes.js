const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController'); // Chỉnh sửa để import song controller
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, 
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not a valid audio or image file! Please upload an audio file or image.'), false);
    }
  }
});


router.get('/', songController.getAllSongs); // Lấy tất cả bài hát
router.get('/:id', songController.getSongById); // Lấy bài hát theo ID
router.post('/', upload.fields([{ name: 'image' }, { name: 'file_song' }]), songController.createSong);
router.put('/:id', upload.fields([{ name: 'image' }, { name: 'file_song' }]), songController.updateSong); 
router.delete('/:id', songController.deleteSong); // Xóa bài hát
router.post('/:id/file', upload.fields([{ name: 'image' }, { name: 'file_song' }]), songController.uploadSongFile);

module.exports = router;
