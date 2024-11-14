// controllers/ratingController.js
const RatingModel = require('../models/ratingModel');

class RatingController {
    async createOrUpdateRating(req, res) {
        try {
            const { songId, rating, comment } = req.body;
            const userId = req.user.id;

            const ratingId = await RatingModel.createRating(
                userId,
                songId,
                rating,
                comment
            );

            return res.status(201).json({
                success: true,
                message: "Rating created/updated successfully",
                data: { ratingId }
            });
        } catch (error) {
            console.error('Error in createOrUpdateRating:', error);
            return res.status(500).json({
                success: false,
                message: "Failed to create/update rating",
                error: error.message
            });
        }
    }

    async getSongRatings(req, res) {
        try {
            const { songId } = req.params;
            const ratingData = await RatingModel.getRatingsBySongId(songId);

            return res.status(200).json({
                success: true,
                data: ratingData
            });
        } catch (error) {
            console.error('Error in getSongRatings:', error);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch ratings",
                error: error.message
            });
        }
    }

    async getUserRating(req, res) {
        try {
            const { songId } = req.params;
            const userId = req.user.id;

            const rating = await RatingModel.getUserRating(userId, songId);
            
            if (!rating) {
                return res.status(404).json({
                    success: false,
                    message: "Rating not found"
                });
            }

            return res.status(200).json({
                success: true,
                data: rating
            });
        } catch (error) {
            console.error('Error in getUserRating:', error);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch user rating",
                error: error.message
            });
        }
    }

    async deleteRating(req, res) {
        try {
            const { songId } = req.params;
            const userId = req.user.id;

            const success = await RatingModel.deleteRating(userId, songId);

            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: "Rating not found or already deleted"
                });
            }

            return res.status(200).json({
                success: true,
                message: "Rating deleted successfully"
            });
        } catch (error) {
            console.error('Error in deleteRating:', error);
            return res.status(500).json({
                success: false,
                message: "Failed to delete rating",
                error: error.message
            });
        }
    }

    async getTopRatedSongs(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const songs = await RatingModel.getTopRatedSongs(limit);

            return res.status(200).json({
                success: true,
                data: songs
            });
        } catch (error) {
            console.error('Error in getTopRatedSongs:', error);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch top rated songs",
                error: error.message
            });
        }
    }

    
}

module.exports = new RatingController();
