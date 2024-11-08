const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController'); // Chỉnh sửa để import song controller
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });


router.get('/', songController.getAllSongs); // Lấy tất cả bài hát
router.get('/:id', songController.getSongById); // Lấy bài hát theo ID
router.post('/', upload.fields([{ name: 'image' }, { name: 'file_song' }]), songController.createSong);
router.put('/:id', upload.fields([{ name: 'image' }, { name: 'file_song' }]), songController.updateSong);
router.delete('/:id', songController.deleteSong); // Xóa bài hát
router.get('/filter/duration', songController.getSongsByDuration);
// http://localhost:5000/api/songs/filter/duration?minDuration=220&maxDuration=300
router.get('/analysis/mood', songController.getSongsByMood);
// http://localhost:5000/api/songs/analysis/mood?mood=happy

module.exports = router;
