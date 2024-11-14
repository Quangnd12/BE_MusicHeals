const db = require('../config/db');

class SongArtistModel {
  // Lấy tất cả các song_artist với thông tin bổ sung từ artist và song
  static async getAllSongArtists(page = 1, limit = 4) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT 
        sa.artistID,
        sa.songID,
        a.name AS artist_name,
        a.avatar AS artist_avatar,
        s.title AS song_title,
        s.image AS song_image,
        s.file_song AS song_file,
        s.listens_count AS song_listens_count
      FROM song_artists AS sa
      JOIN artists AS a ON sa.artistID = a.id
      JOIN songs AS s ON sa.songID = s.id
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await db.execute(query);
    return rows;
  }

  // Đếm tổng số dòng trong bảng song_artist
  static async getSongArtistCount() {
    const query = 'SELECT COUNT(*) as count FROM song_artists';
    const [rows] = await db.execute(query);
    return rows[0].count;
  }

  static async getSongArtistByArtistID(artistID) {
    const query = `
      SELECT 
        sa.artistID,
        sa.songID,
        a.name AS artist_name,
        a.avatar AS artist_avatar,
        s.title AS song_title,
        s.image AS song_image,
        s.file_song AS song_file,
        s.listens_count AS song_listens_count
      FROM song_artists AS sa
      JOIN artists AS a ON sa.artistID = a.id
      JOIN songs AS s ON sa.songID = s.id
      WHERE sa.artistID = ?
    `;
    const [rows] = await db.execute(query, [artistID]);
    return rows;
  }

  static async getSongArtistBySongID(songID) {
    const query = `
      SELECT 
        sa.artistID,
        sa.songID,
        a.name AS artist_name,
        a.avatar AS artist_avatar,
        s.title AS song_title,
        s.image AS song_image,
        s.file_song AS song_file,
        s.listens_count AS song_listens_count
      FROM song_artists AS sa
      JOIN artists AS a ON sa.artistID = a.id
      JOIN songs AS s ON sa.songID = s.id
      WHERE sa.songID = ?
    `;
    const [rows] = await db.execute(query, [songID]);
    return rows;
  }
}

module.exports = SongArtistModel;
