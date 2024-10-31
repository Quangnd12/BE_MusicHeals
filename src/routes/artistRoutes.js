const express = require('express');
const router = express.Router();
const artistController = require('../controllers/artistController'); 
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, 
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

router.get('/', artistController.getAllArtists); 
router.get('/:id', artistController.getArtistById);
router.post('/', upload.single('avatar'), artistController.createArtist); 
router.put('/:id', upload.single('avatar'), artistController.updateArtist); 
router.delete('/:id', artistController.deleteArtist);
router.post('/:id/image', upload.single('avatar'), artistController.uploadArtistImage);

module.exports = router;
