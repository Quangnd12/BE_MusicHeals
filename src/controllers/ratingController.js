// ratingController.js
const RatingModel = require('../models/ratingModel');

class RatingController {
    async createOrUpdateRating(req, res) {
        try {
            const { songId, rating, type = 'star' } = req.body;
            
            if (!songId || rating === undefined) {
                return res.status(400).json({
                    success: false,
                    message: "songId and rating are required"
                });
            }
    
            try {
                RatingModel.validateRating(rating, type);
            } catch (validationError) {
                return res.status(400).json({
                    success: false,
                    message: validationError.message
                });
            }
    
            const result = await RatingModel.createRating(
                req.user.id,
                songId,
                rating,
                type
            );
    
            return res.status(201).json({
                success: true,
                message: "Rating updated successfully",
                data: result
            });
        } catch (error) {
            console.error('Rating creation error:', error);
            return res.status(500).json({
                success: false,
                message: "Failed to create/update rating",
                error: error.message
            });
        }
    }

    async getUserRating(req, res) {
        try {
            const { songId } = req.params;
            const { type = 'star' } = req.query; // Thêm query parameter để chọn kiểu rating
            const userId = req.user.id;

            if (!songId) {
                return res.status(400).json({
                    success: false,
                    message: "songId is required"
                });
            }

            let rating;
            if (type === 'both') {
                rating = await RatingModel.getUserRatingBothTypes(userId, songId);
            } else {
                rating = await RatingModel.getUserRating(userId, songId, type);
            }

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
            console.error('Get user rating error:', error);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch user rating",
                error: error.message
            });
        }
    }

    async getSongRatings(req, res) {
        try {
            const { songId } = req.params;
            const { type = 'star' } = req.query;

            if (!songId) {
                return res.status(400).json({
                    success: false,
                    message: "songId is required"
                });
            }

            if (!['star', 'point'].includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid rating type. Must be either 'star' or 'point'"
                });
            }

            const ratingData = await RatingModel.getRatingsBySongId(songId, type);

            return res.status(200).json({
                success: true,
                data: ratingData
            });
        } catch (error) {
            console.error('Get ratings error:', error);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch ratings",
                error: error.message
            });
        }
    }

    async deleteRating(req, res) {
        try {
            const { songId } = req.params;
            const { type = 'star' } = req.query;
            const userId = req.user.id;

            if (!songId) {
                return res.status(400).json({
                    success: false,
                    message: "songId is required"
                });
            }

            const success = await RatingModel.deleteRating(userId, songId, type);

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
            console.error('Delete rating error:', error);
            return res.status(500).json({
                success: false,
                message: "Failed to delete rating",
                error: error.message
            });
        }
    }

}

module.exports = new RatingController();