const db = require('../config/db');

class FavoriteModel {
  static async toggleFavorite(userId, songId) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Kiểm tra xem đã thích chưa
      const [existingFavorite] = await connection.execute(
        'SELECT * FROM user_favorites WHERE userId = ? AND songId = ?',
        [userId, songId]
      );

      let result;
      if (existingFavorite.length > 0) {
        // Đã thích rồi thì bỏ thích
        await connection.execute(
          'DELETE FROM user_favorites WHERE userId = ? AND songId = ?',
          [userId, songId]
        );
        result = { action: 'unliked', status: false };
      } else {
        // Chưa thích thì thêm vào
        await connection.execute(
          'INSERT INTO user_favorites (userId, songId) VALUES (?, ?)',
          [userId, songId]
        );
        result = { action: 'liked', status: true };
      }

      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      console.error('Favorite Toggle Error:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getUserFavorites(userId) {
    const query = `
            SELECT 
                songs.id,
                songs.title,
                songs.image,
                songs.file_song,
                songs.duration,
                songs.listens_count,
                GROUP_CONCAT(DISTINCT artists.name SEPARATOR ', ') AS artist,
                GROUP_CONCAT(DISTINCT genres.name SEPARATOR ', ') AS genre
            FROM user_favorites
            JOIN songs ON user_favorites.songId = songs.id
            LEFT JOIN song_artists ON songs.id = song_artists.songId
            LEFT JOIN artists ON song_artists.artistId = artists.id
            LEFT JOIN song_genres ON songs.id = song_genres.songID
            LEFT JOIN genres ON song_genres.genreID = genres.id
            WHERE user_favorites.userId = ?
            GROUP BY songs.id
        `;
    const [rows] = await db.execute(query, [userId]);
    return rows;
  }

  static async getFavoriteStatus(userId, songId) {
    const [rows] = await db.execute(
      'SELECT * FROM user_favorites WHERE userId = ? AND songId = ?',
      [userId, songId]
    );
    return rows.length > 0;
  }

  static async getFavoriteCount(songId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM user_favorites WHERE songId = ?',
      [songId]
    );
    return rows[0].count;
  }
  static async getMostLikedSongs(limit = 10) {
    const query = `
        SELECT 
            songs.id,
            songs.title,
            songs.image,
            COUNT(user_favorites.songId) as favorite_count,
            GROUP_CONCAT(DISTINCT artists.name SEPARATOR ', ') AS artist
        FROM songs
        LEFT JOIN user_favorites ON songs.id = user_favorites.songId
        LEFT JOIN song_artists ON songs.id = song_artists.songId
        LEFT JOIN artists ON song_artists.artistId = artists.id
        GROUP BY songs.id, songs.title, songs.image
        ORDER BY favorite_count DESC
        LIMIT ${parseInt(limit)}
    `;
    const [rows] = await db.execute(query);
    return rows;
  }

  static async getFavoritesCountByGenre() {
    const query = `
          SELECT 
              genres.name as genre,
              COUNT(user_favorites.songId) as favorite_count
          FROM genres
          LEFT JOIN song_genres ON genres.id = song_genres.genreID
          LEFT JOIN user_favorites ON song_genres.songID = user_favorites.songId
          GROUP BY genres.id
          ORDER BY favorite_count DESC
      `;
    const [rows] = await db.execute(query);
    return rows;
  }
}


module.exports = FavoriteModel;