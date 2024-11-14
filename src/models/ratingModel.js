const db = require('../config/db');

class RatingModel {
    // Validate rating input
    static validateRating(rating) {
        const numRating = Number(rating);
        if (isNaN(numRating) || numRating < 1 || numRating > 5) {
            throw new Error('Rating must be a number between 1 and 5');
        }
        return numRating;
    }

    static async createRating(userId, songId, rating, comment = null) {
        try {
            // Validate inputs
            if (!userId || !songId) {
                throw new Error('UserId and songId are required');
            }
            
            const validatedRating = this.validateRating(rating);
            
            // Check if song exists first
            const [songExists] = await db.execute(
                'SELECT id FROM songs WHERE id = ?',
                [songId]
            );
            
            if (songExists.length === 0) {
                throw new Error('Song not found');
            }

            const [existing] = await db.execute(
                'SELECT id FROM ratings WHERE userId = ? AND songId = ?',
                [userId, songId]
            );

            if (existing.length > 0) {
                const [result] = await db.execute(
                    `UPDATE ratings 
                     SET rating = ?, 
                         comment = ?, 
                         updatedAt = CURRENT_TIMESTAMP 
                     WHERE userId = ? AND songId = ?`,
                    [validatedRating, comment, userId, songId]
                );
                return { id: existing[0].id, updated: true };
            } else {
                const [result] = await db.execute(
                    `INSERT INTO ratings (userId, songId, rating, comment) 
                     VALUES (?, ?, ?, ?)`,
                    [userId, songId, validatedRating, comment]
                );
                return { id: result.insertId, updated: false };
            }
        } catch (error) {
            console.error('Error in createRating:', error);
            throw error;
        }
    }

    static async getRatingsBySongId(songId) {
        try {
            if (!songId) {
                throw new Error('SongId is required');
            }

            // Get rating statistics with distribution
            const [stats] = await db.execute(
                `SELECT 
                    ROUND(AVG(rating), 2) as averageRating,
                    COUNT(*) as totalRatings,
                    SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as fiveStars,
                    SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as fourStars,
                    SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as threeStars,
                    SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as twoStars,
                    SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as oneStar
                FROM ratings 
                WHERE songId = ?`,
                [songId]
            );

            // Get detailed ratings with user info
            const [ratings] = await db.execute(
                `SELECT 
                    r.id,
                    r.rating,
                    r.comment,
                    r.createdAt,
                    r.updatedAt,
                    u.id as userId,
                    u.username,
                    u.avatar
                FROM ratings r
                JOIN users u ON r.userId = u.id
                WHERE r.songId = ?
                ORDER BY r.createdAt DESC`,
                [songId]
            );

            return {
                summary: {
                    ...stats[0],
                    distribution: {
                        5: stats[0].fiveStars || 0,
                        4: stats[0].fourStars || 0,
                        3: stats[0].threeStars || 0,
                        2: stats[0].twoStars || 0,
                        1: stats[0].oneStar || 0
                    }
                },
                ratings: ratings.map(r => ({
                    id: r.id,
                    rating: r.rating,
                    comment: r.comment,
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
            console.error('Error in getRatingsBySongId:', error);
            throw error;
        }
    }

    static async getUserRating(userId, songId) {
        try {
            if (!userId || !songId) {
                throw new Error('UserId and songId are required');
            }

            const [rating] = await db.execute(
                `SELECT id, rating, comment, createdAt, updatedAt
                FROM ratings
                WHERE userId = ? AND songId = ?`,
                [userId, songId]
            );
            return rating[0] || null;
        } catch (error) {
            console.error('Error in getUserRating:', error);
            throw error;
        }
    }

    static async deleteRating(userId, songId) {
        try {
            if (!userId || !songId) {
                throw new Error('UserId and songId are required');
            }

            const [result] = await db.execute(
                'DELETE FROM ratings WHERE userId = ? AND songId = ?',
                [userId, songId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in deleteRating:', error);
            throw error;
        }
    }

    static async getTopRatedSongs(limit = 10) {
        try {
            if (!Number.isInteger(limit) || limit < 1) {
                throw new Error('Limit must be a positive integer');
            }

            const [songs] = await db.execute(
                `SELECT 
                    s.*,
                    ROUND(AVG(r.rating), 2) as averageRating,
                    COUNT(r.id) as totalRatings
                FROM songs s
                LEFT JOIN ratings r ON s.id = r.songId
                GROUP BY s.id
                HAVING totalRatings > 0
                ORDER BY averageRating DESC, totalRatings DESC
                LIMIT ?`,
                [limit]
            );
            
            return songs;
        } catch (error) {
            console.error('Error in getTopRatedSongs:', error);
            throw error;
        }
    }

    static async getRatingStats() {
        try {
            const [stats] = await db.execute(
                `SELECT 
                    COUNT(*) as totalRatings,
                    ROUND(AVG(rating), 2) as averageRating,
                    COUNT(DISTINCT songId) as ratedSongs,
                    COUNT(DISTINCT userId) as uniqueUsers
                FROM ratings`
            );
            return stats[0];
        } catch (error) {
            console.error('Error in getRatingStats:', error);
            throw error;
        }
    }

    
}

module.exports = RatingModel;