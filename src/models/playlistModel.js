const db = require('../config/db');

class PlaylistModel {
  static async createPlaylist(data) {
    const { name, description, userId, isPublic = true } = data;
    
    const query = `
      INSERT INTO playlists (name, description, userId, isPublic, createdAt)
      VALUES (?, ?, ?, ?, NOW())
    `;
    
    const [result] = await db.execute(query, [name, description, userId, isPublic]);
    return result.insertId;
  }

  static async addSongToPlaylist(playlistId, songId) {
    const query = `
      INSERT INTO playlist_songs (playlistId, songId, addedAt)
      VALUES (?, ?, NOW())
    `;
    
    await db.execute(query, [playlistId, songId]);
  }

  static async getPlaylistDetails(playlistId) {
    const query = `
      SELECT 
        p.*,
        COUNT(ps.songId) as songCount,
        SEC_TO_TIME(SUM(s.duration)) as totalDuration
      FROM playlists p
      LEFT JOIN playlist_songs ps ON p.id = ps.playlistId
      LEFT JOIN songs s ON ps.songId = s.id
      WHERE p.id = ?
      GROUP BY p.id
    `;
    
    const [rows] = await db.execute(query, [playlistId]);
    return rows[0];
  }

  static async getPlaylistSongs(playlistId) {
    const query = `
      SELECT 
        s.id,
        s.title,
        s.image,
        s.duration,
        GROUP_CONCAT(DISTINCT a.name SEPARATOR ', ') as artists
      FROM playlist_songs ps
      JOIN songs s ON ps.songId = s.id
      LEFT JOIN song_artists sa ON s.id = sa.songId
      LEFT JOIN artists a ON sa.artistId = a.id
      WHERE ps.playlistId = ?
      GROUP BY s.id
      ORDER BY ps.addedAt DESC
    `;
    
    const [rows] = await db.execute(query, [playlistId]);
    return rows;
  }

  static async removeSongFromPlaylist(playlistId, songId) {
    const query = `
      DELETE FROM playlist_songs
      WHERE playlistId = ? AND songId = ?
    `;
    
    await db.execute(query, [playlistId, songId]);
  }
}

module.exports = PlaylistModel;