const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const FavoriteController = require('../controllers/favoriteController');

router.post('/toggle/:songId', authMiddleware, FavoriteController.toggleFavorite);
router.get('/list', authMiddleware, FavoriteController.getUserFavorites);
router.get('/status/:songId', authMiddleware, FavoriteController.checkFavoriteStatus);
router.get('/most-liked', authMiddleware, FavoriteController.getMostLikedSongs);
router.get('/favorites-by-genre', authMiddleware, FavoriteController.getFavoritesCountByGenre);
module.exports = router;