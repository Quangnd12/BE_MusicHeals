// playlistModel.js
const db = require('../config/db');

class PlaylistModel {
  static async createPlaylist(userId, name, description = null, isPublic = true) {
    const query = `
      INSERT INTO playlists (userId, name, description, isPublic, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `;
    const [result] = await db.execute(query, [userId, name, description, isPublic]);
    return result.insertId;
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

  static async getPlaylistById(playlistId) {
    const query = `
      SELECT p.*,
             u.username as creatorName,
             GROUP_CONCAT(DISTINCT s.id) as songIds,
             GROUP_CONCAT(DISTINCT s.title) as songTitles,
             COUNT(DISTINCT ps.songId) as totalSongs
      FROM playlists p
      LEFT JOIN users u ON p.userId = u.id
      LEFT JOIN playlist_songs ps ON p.id = ps.playlistId
      LEFT JOIN songs s ON ps.songId = s.id
      WHERE p.id = ?
      GROUP BY p.id
    `;
    const [rows] = await db.execute(query, [playlistId]);
    return rows[0];
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

  static async getPublicPlaylists(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT p.*,
             u.username as creatorName,
             COUNT(DISTINCT ps.songId) as totalSongs
      FROM playlists p
      LEFT JOIN users u ON p.userId = u.id
      LEFT JOIN playlist_songs ps ON p.id = ps.playlistId
      WHERE p.isPublic = true
      GROUP BY p.id
      ORDER BY p.createdAt DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.execute(query, [limit, offset]);
    return rows;
  }

  static async updatePlaylist(playlistId, data) {
    const { name, description, isPublic } = data;
    const query = `
      UPDATE playlists 
      SET name = ?, description = ?, isPublic = ?, updatedAt = NOW()
      WHERE id = ?
    `;
    await db.execute(query, [name, description, isPublic, playlistId]);
  }

  static async deletePlaylist(playlistId) {
    // Delete all songs from playlist first
    await db.execute('DELETE FROM playlist_songs WHERE playlistId = ?', [playlistId]);
    // Then delete the playlist
    await db.execute('DELETE FROM playlists WHERE id = ?', [playlistId]);
  }

  static async getPlaylistSongs(playlistId) {
    const query = `
      SELECT s.*,
             GROUP_CONCAT(DISTINCT ar.name) as artists,
             GROUP_CONCAT(DISTINCT g.name) as genres
      FROM songs s
      JOIN playlist_songs ps ON s.id = ps.songId
      LEFT JOIN song_artists sa ON s.id = sa.songId
      LEFT JOIN artists ar ON sa.artistId = ar.id
      LEFT JOIN song_genres sg ON s.id = sg.songId
      LEFT JOIN genres g ON sg.genreId = g.id
      WHERE ps.playlistId = ?
      GROUP BY s.id
      ORDER BY ps.addedAt DESC
    `;
    const [rows] = await db.execute(query, [playlistId]);
    return rows;
  }
}

module.exports = PlaylistModel;