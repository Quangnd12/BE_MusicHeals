// playlistModel.js
const db = require('../config/db');

class PlaylistModel {
  static async createPlaylist(userId, name, description = null, isPublic = true, image = null) {
    const query = `
            INSERT INTO playlists (userId, name, description, isPublic, image, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        `;
    const [result] = await db.execute(query, [userId, name, description, isPublic, image]);
    return result.insertId;
  }

  static async updatePlaylist(id, data) {
    const { name, description, isPublic, image } = data;
    const query = `
            UPDATE playlists 
            SET name = ?, 
                description = ?, 
                isPublic = ?, 
                image = ?,
                updatedAt = NOW()
            WHERE id = ?
        `;
    await db.execute(query, [name, description, isPublic, image, id]);
  }


  static async getPublicPlaylists(page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC', search = '') {
    try {
      const offset = (page - 1) * limit;
      let params = [];
      let whereConditions = ['p.isPublic = 1'];
      
      // Handle search condition
      if (search.trim()) {
        whereConditions.push('(p.name LIKE ? OR p.description LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }
  
      // Build WHERE clause
      const whereClause = whereConditions.join(' AND ');
  
      // Count total items
      const countQuery = `
        SELECT COUNT(DISTINCT p.id) as total 
        FROM playlists p 
        WHERE ${whereClause}
      `;
      const [countResult] = await db.execute(countQuery, params);
      const totalItems = countResult[0]?.total || 0;
  
      // Build main query
      const query = `
        SELECT 
          p.id,
          p.userId,
          p.name,
          p.description,
          p.isPublic,
          p.createdAt,
          p.updatedAt,
          p.image,
          u.username as creatorName,
          COUNT(DISTINCT ps.songId) as totalSongs
        FROM playlists p
        LEFT JOIN users u ON p.userId = u.id
        LEFT JOIN playlist_songs ps ON p.id = ps.playlistId
        WHERE ${whereClause}
        GROUP BY p.id
        ORDER BY p.${sortBy} ${sortOrder}
        LIMIT ${parseInt(limit)} OFFSET ${offset}
      `;
  
      // Execute main query
      const [rows] = await db.execute(query, params);
  
      return {
        items: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems,
          totalPages: Math.ceil(totalItems / parseInt(limit))
        }
      };
    } catch (error) {
      console.error('Error in getPublicPlaylists:', error);
      throw error;
    }
  }

  static async getPlaylistSongs(playlistId) {
    const query = `
      SELECT 
        s.*,
        ps.addedAt,
        GROUP_CONCAT(DISTINCT a.name) as artistNames,
        GROUP_CONCAT(DISTINCT a.id) as artistIds
      FROM playlist_songs ps
      JOIN songs s ON ps.songId = s.id
      JOIN song_artists sa ON s.id = sa.songID
      JOIN artists a ON sa.artistID = a.id
      WHERE ps.playlistId = ?
      GROUP BY s.id, ps.addedAt
      ORDER BY ps.addedAt DESC
    `;
    
    const [rows] = await db.execute(query, [playlistId]);
    return rows;
  }
  static async getPlaylistById(id) {
    try {
      const query = `
        SELECT 
          p.*,
          u.username as creatorName,
          COUNT(DISTINCT ps.songId) as totalSongs
        FROM playlists p
        LEFT JOIN users u ON p.userId = u.id
        LEFT JOIN playlist_songs ps ON p.id = ps.playlistId
        WHERE p.id = ?
        GROUP BY p.id
      `;
      const [rows] = await db.execute(query, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('getPlaylistById error:', error);
      throw error;
    }
  }



  static async getUserPlaylists(userId) {
    const query = `
            SELECT p.*,
                   COUNT(DISTINCT ps.songId) as totalSongs
            FROM playlists p
            LEFT JOIN playlist_songs ps ON p.id = ps.playlistId
            WHERE p.userId = ?
            GROUP BY p.id
            ORDER BY p.createdAt DESC
        `;
    const [rows] = await db.execute(query, [userId]);
    return rows;
  }



  static async addSongToPlaylist(playlistId, songId) {
    const query = `
            INSERT INTO playlist_songs (playlistId, songId, addedAt)
            VALUES (?, ?, NOW())
        `;
    await db.execute(query, [playlistId, songId]);
  }

  static async removeSongFromPlaylist(playlistId, songId) {
    const query = `
            DELETE FROM playlist_songs 
            WHERE playlistId = ? AND songId = ?
        `;
    await db.execute(query, [playlistId, songId]);
  }

  static async deletePlaylist(id) {
    await db.execute('DELETE FROM playlist_songs WHERE playlistId = ?', [id]);
    await db.execute('DELETE FROM playlists WHERE id = ?', [id]);
  }
}

module.exports = PlaylistModel;