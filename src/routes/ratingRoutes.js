const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const ratingController = require('../controllers/ratingController');

router.post('/', authMiddleware, ratingController.createOrUpdateRating);
router.get('/song/:songId', ratingController.getSongRatings);
router.get('/user/song/:songId', authMiddleware, ratingController.getUserRating);
router.delete('/song/:songId', authMiddleware, ratingController.deleteRating);


module.exports = router;