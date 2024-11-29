const express = require('express');
const router = express.Router();
const artistController = require('../controllers/artistController'); 
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
// const { authMiddleware } = require('../middlewares/authMiddleware');

// router.use(authMiddleware);
router.get('/search', artistController.searchArtists); // Tìm kiếm nghệ sĩ theo tên
router.get('/', artistController.getAllArtists); 
router.get('/:id', artistController.getArtistById);
router.post('/', upload.single('avatar'), artistController.createArtist); 
router.put('/:id', upload.single('avatar'), artistController.updateArtist); 
router.delete('/:id', artistController.deleteArtist);


module.exports = router;
