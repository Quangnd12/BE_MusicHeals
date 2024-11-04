const express = require('express');
const router = express.Router();
const genreController = require('../controllers/genreController');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', genreController.getAllGenres); 
router.get('/:id', genreController.getGenreById);
router.post('/', upload.single('image'), genreController.createGenre); 
router.put('/:id', upload.single('image'), genreController.updateGenre); 
router.delete('/:id', genreController.deleteGenre); 

module.exports = router;
