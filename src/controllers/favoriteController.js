const FavoriteModel = require('../models/favoriteModel');

class FavoriteController {
    static async toggleFavorite(req, res) {
        try {
            const userId = req.user.id;
            const { songId } = req.params;

            const result = await FavoriteModel.toggleFavorite(userId, songId);
            const favoriteCount = await FavoriteModel.getFavoriteCount(songId);

            res.status(200).json({
                success: true,
                message: `Song ${result.action} successfully`,
                action: result.action,
                favoriteCount: favoriteCount
            });
        } catch (error) {
            console.error('Toggle Favorite Error:', error);
            res.status(500).json({
                success: false,
                message: 'Error toggling favorite',
                error: error.message
            });
        }
    }

    static async getUserFavorites(req, res) {
        try {
            const userId = req.user.id;
            const favorites = await FavoriteModel.getUserFavorites(userId);

            res.status(200).json({
                success: true,
                total: favorites.length,
                favorites
            });
        } catch (error) {
            console.error('Get Favorites Error:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching favorites',
                error: error.message
            });
        }
    }

    static async checkFavoriteStatus(req, res) {
        try {
            const userId = req.user.id;
            const { songId } = req.params;

            const isFavorite = await FavoriteModel.getFavoriteStatus(userId, songId);
            const favoriteCount = await FavoriteModel.getFavoriteCount(songId);

            res.status(200).json({
                success: true,
                isFavorite,
                favoriteCount
            });
        } catch (error) {
            console.error('Check Favorite Status Error:', error);
            res.status(500).json({
                success: false,
                message: 'Error checking favorite status',
                error: error.message
            });
        }
    }
    static async getMostLikedSongs(req, res) {
      try {
          const limit = req.query.limit ? parseInt(req.query.limit) : 10;
          const mostLikedSongs = await FavoriteModel.getMostLikedSongs(limit);
          
          res.status(200).json({
              success: true,
              total: mostLikedSongs.length,
              songs: mostLikedSongs
          });
      } catch (error) {
          console.error('Get Most Liked Songs Error:', error);
          res.status(500).json({
              success: false,
              message: 'Error fetching most liked songs',
              error: error.message
          });
      }
  }
  
  static async getFavoritesCountByGenre(req, res) {
      try {
          const genreFavorites = await FavoriteModel.getFavoritesCountByGenre();
          
          res.status(200).json({
              success: true,
              total: genreFavorites.length,
              genreFavorites
          });
      } catch (error) {
          console.error('Get Favorites by Genre Error:', error);
          res.status(500).json({
              success: false,
              message: 'Error fetching favorites by genre',
              error: error.message
          });
      }
  }
}

module.exports = FavoriteController;