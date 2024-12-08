const db = require('../config/db');
const leoProfanity = require('leo-profanity');

class ArtistSongModel {
  static async createSong(songData) {
    const {
      title,
      image,
      file_song,
      albumID = null,
      genreID,
      duration,
      releaseDate,
      is_premium = 0,
      artist_id,
      lyrics = null
    } = songData;

    const cleanLyrics = lyrics ? leoProfanity.clean(lyrics) : null;
    const is_explicit = lyrics && leoProfanity.check(lyrics) ? 1 : 0;

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Thêm bài hát vào bảng artist_songs
      const [result] = await connection.execute(
        'INSERT INTO artist_songs (title, image, file_song, lyrics, duration, releaseDate, is_explicit, is_premium, artist_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [title, image, file_song, cleanLyrics, duration, releaseDate, is_explicit, is_premium, artist_id]
      );

      const songId = result.insertId;

      // Thêm thể loại
      if (genreID && genreID.length > 0) {
        const genreValues = genreID.map(id => [songId, id]);
        await connection.query(
          'INSERT INTO artist_song_genres (songID, genreID) VALUES ?',
          [genreValues]
        );
      }

      // Thêm album nếu có
      if (albumID && albumID.length > 0) {
        const albumValues = albumID.map(id => [songId, id]);
        await connection.query(
          'INSERT INTO artist_song_albums (songID, albumID) VALUES ?',
          [albumValues]
        );
      }

      await connection.commit();
      return songId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getSongsByArtistId(artistId, status = null, page = 1, limit = 10) {
    try {
      const limitNum = Number(limit);
      const offsetNum = Number((page - 1) * limit);
      const artistIdNum = Number(artistId);

      // Sử dụng query đơn giản hơn
      const baseQuery = `
        SELECT SQL_CALC_FOUND_ROWS
          ar_songs.*,
          GROUP_CONCAT(DISTINCT g.id) as genreIDs,
          GROUP_CONCAT(DISTINCT g.name) as genreNames,
          GROUP_CONCAT(DISTINCT a.id) as albumIDs,
          GROUP_CONCAT(DISTINCT a.title) as albumNames
        FROM artist_songs ar_songs
        LEFT JOIN artist_song_genres asg ON ar_songs.id = asg.songID
        LEFT JOIN genres g ON asg.genreID = g.id
        LEFT JOIN artist_song_albums asa ON ar_songs.id = asa.songID
        LEFT JOIN albums a ON asa.albumID = a.id
        WHERE ar_songs.artist_id = ${artistIdNum}
        ${status ? `AND ar_songs.status = '${status}'` : ''}
        GROUP BY ar_songs.id
        ORDER BY ar_songs.created_at DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `;

      // Thực hiện query chính
      const [songs] = await db.query(baseQuery);

      // Lấy tổng số bản ghi
      const [countResult] = await db.query('SELECT FOUND_ROWS() as total');
      const totalSongs = countResult[0].total;

      const formattedSongs = songs.map(song => ({
        ...song,
        genres: song.genreIDs ? song.genreIDs.split(',').map((id, index) => ({
          id: Number(id),
          name: song.genreNames?.split(',')[index]
        })) : [],
        albums: song.albumIDs ? song.albumIDs.split(',').map((id, index) => ({
          id: Number(id),
          title: song.albumNames?.split(',')[index]
        })) : []
      }));

      return {
        songs: formattedSongs,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalSongs / limitNum),
          totalItems: totalSongs,
          itemsPerPage: limitNum
        }
      };
    } catch (error) {
      console.error('Error in getSongsByArtistId:', error);
      throw error;
    }
  }

  static async getAllGenres() {
    const query = 'SELECT * FROM genres ORDER BY name';
    const [genres] = await db.execute(query);
    return genres;
  }

  static async getAllAlbums(artistId) {
    const query = 'SELECT * FROM albums WHERE artistID = ? ORDER BY title';
    const [albums] = await db.execute(query, [artistId]);
    return albums;
  }

  static async getSongById(id) {
    const query = `
      SELECT 
        ar_songs.*,
        GROUP_CONCAT(DISTINCT g.name SEPARATOR ', ') as genres,
        GROUP_CONCAT(DISTINCT g.id SEPARATOR ', ') as genreIDs,
        GROUP_CONCAT(DISTINCT a.title SEPARATOR ', ') as albums,
        GROUP_CONCAT(DISTINCT a.id SEPARATOR ', ') as albumIDs
      FROM artist_songs ar_songs
      LEFT JOIN artist_song_genres asg ON ar_songs.id = asg.songID
      LEFT JOIN genres g ON asg.genreID = g.id
      LEFT JOIN artist_song_albums asa ON ar_songs.id = asa.songID
      LEFT JOIN albums a ON asa.albumID = a.id
      WHERE ar_songs.id = ?
      GROUP BY ar_songs.id
    `;

    const [rows] = await db.execute(query, [id]);
    return rows[0];
  }

  static async updateSong(id, songData) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const {
        title,
        image,
        file_song,
        duration,
        releaseDate,
        is_premium,
        genreID,
        albumID
      } = songData;

      // Lấy thông tin bài hát hiện tại
      const [currentSong] = await connection.execute(
        'SELECT * FROM artist_songs WHERE id = ?',
        [id]
      );

      if (!currentSong || currentSong.length === 0) {
        throw new Error('Không tìm thấy bài hát');
      }

      // Chuẩn bị dữ liệu cập nhật, sử dụng giá trị hiện tại nếu không có giá trị mới
      const updateData = {
        title: title || currentSong[0].title,
        image: image || currentSong[0].image,
        file_song: file_song || currentSong[0].file_song,
        duration: duration || currentSong[0].duration,
        releaseDate: releaseDate || currentSong[0].releaseDate,
        is_premium: is_premium === undefined ? currentSong[0].is_premium : is_premium
      };

      // Cập nhật thông tin bài hát
      const updateQuery = `
        UPDATE artist_songs 
        SET title = ?, 
            image = ?, 
            file_song = ?, 
            duration = ?, 
            releaseDate = ?, 
            is_premium = ?
        WHERE id = ?
      `;

      await connection.execute(updateQuery, [
        updateData.title,
        updateData.image,
        updateData.file_song,
        updateData.duration,
        updateData.releaseDate,
        updateData.is_premium,
        id
      ]);

      // Cập nhật thể loại nếu có
      if (genreID && Array.isArray(genreID) && genreID.length > 0) {
        await connection.execute('DELETE FROM artist_song_genres WHERE songID = ?', [id]);
        const genreValues = genreID.map(gid => [id, gid]);
        await connection.query(
          'INSERT INTO artist_song_genres (songID, genreID) VALUES ?',
          [genreValues]
        );
      }

      // Cập nhật album nếu có
      if (albumID && Array.isArray(albumID) && albumID.length > 0) {
        await connection.execute('DELETE FROM artist_song_albums WHERE songID = ?', [id]);
        const albumValues = albumID.map(aid => [id, aid]);
        await connection.query(
          'INSERT INTO artist_song_albums (songID, albumID) VALUES ?',
          [albumValues]
        );
      }

      await connection.commit();
      return {
        success: true,
        message: 'Cập nhật bài hát thành công'
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async deleteSong(id) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Xóa các liên kết với genres
      await connection.execute(
        'DELETE FROM artist_song_genres WHERE songID = ?',
        [id]
      );

      // Xóa các liên kết với albums
      await connection.execute(
        'DELETE FROM artist_song_albums WHERE songID = ?',
        [id]
      );

      // Xóa bài hát
      await connection.execute(
        'DELETE FROM artist_songs WHERE id = ?',
        [id]
      );

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async updateStatus(id, status) {
    const query = 'UPDATE artist_songs SET status = ? WHERE id = ?';
    const [result] = await db.execute(query, [status, id]);
    return result.affectedRows > 0;
  }
}

module.exports = ArtistSongModel; 