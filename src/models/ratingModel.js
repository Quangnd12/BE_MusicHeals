// ratingModel.js
const db = require('../config/db');

class RatingModel {
    static convertRating(rating, fromType, toType) {
        if (fromType === toType) return rating;

        if (fromType === 'point' && toType === 'star') {
            // Convert point to star (0-100 -> 1-5)
            return Math.round((rating / 20) * 2) / 2;
        } 
        
        if (fromType === 'star' && toType === 'point') {
            // Convert star to point (1-5 -> 0-100)
            return Math.round(rating * 20);
        }

        throw new Error('Invalid conversion types');
    }

    static validateRating(rating, type) {
        const numRating = Number(rating);

        if (isNaN(numRating)) {
            throw new Error('Rating must be a number');
        }

        switch (type) {
            case 'star':
                if (numRating < 1 || numRating > 5 || (numRating * 2) % 1 !== 0) {
                    throw new Error('Star rating must be a whole or half number between 1 and 5');
                }
                break;

            case 'point':
                if (!Number.isInteger(numRating) || numRating < 0 || numRating > 100) {
                    throw new Error('Point rating must be a whole number between 0 and 100');
                }
                break;

            default:
                throw new Error('Invalid rating type. Must be either "star" or "point"');
        }
        return numRating;
    }

    static async createRating(userId, songId, rating, type = 'star') {
        const connection = await db.getConnection();
        try {
            if (!userId || !songId) {
                throw new Error('userId and songId are required');
            }

            // Validate primary rating
            const validatedRating = this.validateRating(rating, type);
            
            // Calculate the other rating type
            const otherType = type === 'star' ? 'point' : 'star';
            const convertedRating = this.convertRating(validatedRating, type, otherType);

            await connection.beginTransaction();

            // Check if song exists
            const [songExists] = await connection.execute(
                'SELECT id FROM songs WHERE id = ?',
                [songId]
            );

            if (songExists.length === 0) {
                throw new Error('Song not found');
            }

            // Insert/update both ratings in sequence
            await connection.execute(
                `INSERT INTO ratings (userId, songId, rating, ratingType)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    rating = VALUES(rating),
                    updatedAt = CURRENT_TIMESTAMP`,
                [userId, songId, validatedRating, type]
            );

            await connection.execute(
                `INSERT INTO ratings (userId, songId, rating, ratingType)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    rating = VALUES(rating),
                    updatedAt = CURRENT_TIMESTAMP`,
                [userId, songId, convertedRating, otherType]
            );

            // Get both ratings
            const [ratings] = await connection.execute(
                `SELECT rating, ratingType 
                 FROM ratings 
                 WHERE userId = ? AND songId = ?`,
                [userId, songId]
            );

            await connection.commit();

            return {
                userId,
                songId,
                ratings: ratings.reduce((acc, curr) => {
                    acc[curr.ratingType] = Number(curr.rating);
                    return acc;
                }, {})
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getUserRating(userId, songId, returnType = 'star') {
        try {
            if (!['star', 'point'].includes(returnType)) {
                throw new Error('Invalid rating type. Must be either "star" or "point"');
            }

            // Get rating of the requested type
            const [ratings] = await db.execute(
                `SELECT rating, ratingType 
                 FROM ratings 
                 WHERE userId = ? AND songId = ? AND ratingType = ?`,
                [userId, songId, returnType]
            );

            if (ratings.length === 0) return null;

            return {
                rating: Number(ratings[0].rating),
                type: returnType
            };

        } catch (error) {
            throw error;
        }
    }

    static async getRatingsBySongId(songId, returnType = 'star') {
        try {
            if (!songId) throw new Error('SongId is required');
            
            if (!['star', 'point'].includes(returnType)) {
                throw new Error('Invalid rating type. Must be either "star" or "point"');
            }

            // Get all ratings of the requested type
            const [ratings] = await db.execute(
                `SELECT 
                    r.id,
                    r.rating,
                    r.ratingType,
                    r.createdAt,
                    r.updatedAt,
                    u.id as userId,
                    u.username,
                    u.avatar
                FROM ratings r
                JOIN users u ON r.userId = u.id
                WHERE r.songId = ? AND r.ratingType = ?`,
                [songId, returnType]
            );

            const stats = this.calculateStats(ratings, returnType);

            return {
                summary: stats,
                ratings: ratings.map(r => ({
                    id: r.id,
                    rating: Number(r.rating),
                    type: returnType,
                    createdAt: r.createdAt,
                    updatedAt: r.updatedAt,
                    user: {
                        id: r.userId,
                        username: r.username,
                        avatar: r.avatar
                    }
                }))
            };

        } catch (error) {
            throw error;
        }
    }

    // Phương thức mới để lấy rating theo cả hai kiểu
    static async getUserRatingBothTypes(userId, songId) {
        try {
            const [ratings] = await db.execute(
                `SELECT rating, ratingType 
                 FROM ratings 
                 WHERE userId = ? AND songId = ?`,
                [userId, songId]
            );

            if (ratings.length === 0) return null;

            return ratings.reduce((acc, curr) => {
                acc[curr.ratingType] = Number(curr.rating);
                return acc;
            }, {});

        } catch (error) {
            throw error;
        }
    }

    static calculateStats(ratings, type) {
        if (!ratings || ratings.length === 0) {
            return {
                averageRating: 0,
                totalRatings: 0,
                distribution: type === 'star' 
                    ? { 5: 0, 4.5: 0, 4: 0, 3.5: 0, 3: 0, 2.5: 0, 2: 0, 1.5: 0, 1: 0 }
                    : { excellent: 0, veryGood: 0, good: 0, fair: 0, poor: 0 }
            };
        }

        const totalRatings = ratings.length;
        const averageRating = Number((ratings.reduce((sum, r) => sum + Number(r.rating), 0) / totalRatings).toFixed(2));

        let distribution;
        if (type === 'star') {
            distribution = {
                5: 0, 4.5: 0, 4: 0, 3.5: 0, 3: 0, 2.5: 0, 2: 0, 1.5: 0, 1: 0
            };
            ratings.forEach(r => {
                const rating = Number(r.rating);
                distribution[rating] = (distribution[rating] || 0) + 1;
            });
        } else {
            distribution = {
                excellent: ratings.filter(r => r.rating >= 90).length,
                veryGood: ratings.filter(r => r.rating >= 80 && r.rating < 90).length,
                good: ratings.filter(r => r.rating >= 70 && r.rating < 80).length,
                fair: ratings.filter(r => r.rating >= 60 && r.rating < 70).length,
                poor: ratings.filter(r => r.rating < 60).length
            };
        }

        return { averageRating, totalRatings, distribution };
    }

    static async deleteRating(userId, songId, type = 'star') {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Delete both star and point ratings
            const [result] = await connection.execute(
                'DELETE FROM ratings WHERE userId = ? AND songId = ?',
                [userId, songId]
            );

            await connection.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }


}

module.exports = RatingModel;