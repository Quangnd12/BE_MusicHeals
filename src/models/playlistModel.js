const db = require('../config/db');

class PlaylistModel {
  static async getAllPlaylists(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    // Convert parameters to numbers to ensure proper type
    const params = [
      Number(userId),
      Number(limit),
      Number(offset)
    ];

    const query = `
      SELECT 
        playlists.id,
        playlists.title,
        playlists.description,
        playlists.image,
        playlists.created_at,
        playlists.updated_at,
        playlists.userId,
        COUNT(DISTINCT playlist_songs.songId) as song_count,
        users.username as creator
      FROM playlists
      LEFT JOIN playlist_songs ON playlists.id = playlist_songs.playlistId
      LEFT JOIN users ON playlists.userId = users.id
      WHERE playlists.userId = ?
      GROUP BY 
        playlists.id,
        playlists.title,
        playlists.description,
        playlists.image,
        playlists.created_at,
        playlists.updated_at,
        playlists.userId,
        users.username
      ORDER BY playlists.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [rows] = await db.execute(query, params);
    
    // Get songs for each playlist
    for (let playlist of rows) {
      const songsQuery = `
        SELECT 
          songs.id,
          songs.title,
          songs.duration,
          songs.file_song,
          songs.image,
          GROUP_CONCAT(DISTINCT artists.name SEPARATOR ', ') as artists
        FROM playlist_songs
        JOIN songs ON playlist_songs.songId = songs.id
        LEFT JOIN song_artists ON songs.id = song_artists.songId
        LEFT JOIN artists ON song_artists.artistId = artists.id
        WHERE playlist_songs.playlistId = ?
        GROUP BY 
          songs.id,
          songs.title,
          songs.duration,
          songs.file_song,
          songs.image
      `;
      const [songsResult] = await db.execute(songsQuery, [playlist.id]);
      playlist.songs = songsResult;
    }
    
    return rows;
  }

  static async getPlaylistById(id) {
    const query = `
      SELECT 
        playlists.id,
        playlists.title,
        playlists.description,
        playlists.image,
        playlists.created_at,
        playlists.updated_at,
        playlists.userId,
        users.username as creator
      FROM playlists
      LEFT JOIN users ON playlists.userId = users.id
      WHERE playlists.id = ?
    `;
    
    const [rows] = await db.execute(query, [Number(id)]);
    if (!rows[0]) return null;

    // Get songs for the playlist
    const songsQuery = `
      SELECT 
        songs.id,
        songs.title,
        songs.duration,
        songs.file_song,
        songs.image,
        GROUP_CONCAT(DISTINCT artists.name SEPARATOR ', ') as artists
      FROM playlist_songs
      JOIN songs ON playlist_songs.songId = songs.id
      LEFT JOIN song_artists ON songs.id = song_artists.songId
      LEFT JOIN artists ON song_artists.artistId = artists.id
      WHERE playlist_songs.playlistId = ?
      GROUP BY 
        songs.id,
        songs.title,
        songs.duration,
        songs.file_song,
        songs.image
    `;
    
    const [songs] = await db.execute(songsQuery, [Number(id)]);
    rows[0].songs = songs;
    
    return rows[0];
  }

  static async createPlaylist(playlistData) {
    const {
      title,
      description,
      image,
      userId,
      songs
    } = playlistData;

    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Check if playlist with same title exists for this user
      const [existingPlaylists] = await connection.execute(
        'SELECT id FROM playlists WHERE title = ? AND userId = ?',
        [title, Number(userId)]
      );

      if (existingPlaylists.length > 0) {
        await connection.rollback();
        throw new Error('Playlist with this title already exists for this user');
      }

      // Insert playlist
      const [result] = await connection.execute(
        'INSERT INTO playlists (title, description, image, userId, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [title, description, image, Number(userId)]
      );

      const playlistId = result.insertId;

      // Add songs to playlist if provided
      if (songs && songs.length > 0) {
        const values = songs.map(songId => [playlistId, Number(songId)]);
        await connection.query('INSERT INTO playlist_songs (playlistId, songId) VALUES ?', [values]);
      }

      await connection.commit();
      return playlistId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async updatePlaylist(id, playlistData) {
    const {
      title,
      description,
      image,
      songs
    } = playlistData;

    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Update playlist details
      await connection.execute(
        'UPDATE playlists SET title = ?, description = ?, image = ?, updated_at = NOW() WHERE id = ?',
        [title, description, image, Number(id)]
      );

      // Update songs if provided
      if (songs !== undefined) {
        // Remove existing songs
        await connection.execute('DELETE FROM playlist_songs WHERE playlistId = ?', [Number(id)]);
        
        // Add new songs
        if (songs.length > 0) {
          const values = songs.map(songId => [Number(id), Number(songId)]);
          await connection.query('INSERT INTO playlist_songs (playlistId, songId) VALUES ?', [values]);
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async deletePlaylist(id) {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Delete associated songs first
      await connection.execute('DELETE FROM playlist_songs WHERE playlistId = ?', [Number(id)]);
      // Delete playlist
      await connection.execute('DELETE FROM playlists WHERE id = ?', [Number(id)]);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getPlaylistCount(userId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM playlists WHERE userId = ?',
      [Number(userId)]
    );
    return rows[0].count;
  }
}

module.exports = PlaylistModel;