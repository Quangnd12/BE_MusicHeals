const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController'); 
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });


router.get('/', songController.getAllSongs); 
router.get('/:id', songController.getSongById);
router.post('/', upload.fields([{ name: 'image' }, { name: 'file_song' }]), songController.createSong);
router.put('/:id', upload.fields([{ name: 'image' }, { name: 'file_song' }]), songController.updateSong);
router.put('/playcount/:id', songController.UpdatePlayCount);
router.delete('/:id', songController.deleteSong); 


module.exports = router;
