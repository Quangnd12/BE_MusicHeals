const db = require("../config/db");

class ArtistAlbumModel {
  static async checkDuplicateAlbumTitle(title, artistId, excludeId = null) {
    let query = 'SELECT COUNT(*) as count FROM artist_albums WHERE title = ? AND artist_id = ?';
    const params = [title, artistId];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const [rows] = await db.execute(query, params);
    return rows[0].count > 0;
  }

  static async createAlbum(albumData) {
    const { title, description, cover_image, release_date, artist_id } = albumData;
    const connection = await db.getConnection();

    try {
      // Kiểm tra trùng tên album
      const isDuplicate = await this.checkDuplicateAlbumTitle(title, artist_id);
      if (isDuplicate) {
        throw new Error('Tên album đã tồn tại cho nghệ sĩ này');
      }

      await connection.beginTransaction();

      // 1. Thêm vào bảng artist_albums
      const artistAlbumQuery = `
        INSERT INTO artist_albums 
        (title, description, cover_image, release_date, artist_id)
        VALUES (?, ?, ?, ?, ?)
      `;

      const [artistAlbumResult] = await connection.execute(artistAlbumQuery, [
        title,
        description,
        cover_image,
        release_date,
        artist_id,
      ]);

      const artistAlbumId = artistAlbumResult.insertId;

      // 2. Thêm vào bảng albums
      const albumQuery = `
        INSERT INTO albums 
        (title, image, artistID, releaseDate)
        VALUES (?, ?, ?, ?)
      `;

      const [albumResult] = await connection.execute(albumQuery, [
        title,
        cover_image,
        artist_id,
        release_date,
      ]);

      const albumId = albumResult.insertId;

      // 3. Thêm vào bảng album_artists để liên kết
      const albumArtistQuery = `
        INSERT INTO album_artists 
        (albumID, artistID)
        VALUES (?, ?)
      `;

      await connection.execute(albumArtistQuery, [albumId, artist_id]);

      await connection.commit();

      return {
        artistAlbumId,
        albumId
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getAlbumById(albumId) {
    const query = `
      SELECT 
        a.*,
        COUNT(DISTINCT aas.song_id) as total_songs
      FROM artist_albums a
      LEFT JOIN artist_album_songs aas ON a.id = aas.album_id
      WHERE a.id = ?
      GROUP BY a.id
    `;

    const [rows] = await db.execute(query, [albumId]);
    if (rows.length === 0) return null;

    return {
      ...rows[0],
      total_songs: parseInt(rows[0].total_songs) || 0,
    };
  }

  static async addSongsToAlbum(albumId, songIds, artistId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Kiểm tra album của nghệ sĩ và lấy thông tin album chính
      const [albumInfo] = await connection.execute(
        `SELECT 
          aa.id as artist_album_id,
          aa.title,
          a.id as main_album_id
         FROM artist_albums aa
         LEFT JOIN albums a ON a.title = aa.title AND a.artistID = aa.artist_id
         WHERE aa.id = ? AND aa.artist_id = ?`,
        [albumId, artistId]
      );

      if (albumInfo.length === 0) {
        throw new Error('Album không tồn tại hoặc không thuộc về nghệ sĩ này');
      }

      // 2. Kiểm tra và lấy thông tin bài hát từ cả hai hệ thống
      const songIdsString = songIds.join(',');
      const [songInfo] = await connection.execute(
        `SELECT 
          ars.id as artist_song_id,
          ars.title,
          s.id as main_song_id
         FROM artist_songs ars
         LEFT JOIN songs s ON s.title = ars.title
         LEFT JOIN song_artists sa ON s.id = sa.songID AND sa.artistID = ars.artist_id
         WHERE ars.id IN (${songIdsString}) AND ars.artist_id = ?`,
        [artistId]
      );

      if (songInfo.length === 0) {
        throw new Error('Không tìm thấy bài hát tương ứng');
      }

      // 3. Thêm vào artist_album_songs
      for (const song of songInfo) {
        await connection.execute(
          'INSERT IGNORE INTO artist_album_songs (album_id, song_id) VALUES (?, ?)',
          [albumId, song.artist_song_id]
        );

        // 4. Nếu có bài hát và album trong hệ thống chính, thêm vào song_albums
        if (song.main_song_id && albumInfo[0].main_album_id) {
          await connection.execute(
            'INSERT IGNORE INTO song_albums (songID, albumID) VALUES (?, ?)',
            [song.main_song_id, albumInfo[0].main_album_id]
          );
        }
      }

      await connection.commit();
      return {
        success: true,
        message: 'Thêm bài hát vào album thành công',
        songIds: songInfo.map(song => song.artist_song_id),
        mainAlbumId: albumInfo[0].main_album_id
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getAlbumsByArtistId(artistId) {
    const query = `
      SELECT 
        a.*,
        COUNT(DISTINCT aas.song_id) as total_songs
      FROM artist_albums a
      LEFT JOIN artist_album_songs aas ON a.id = aas.album_id
      WHERE a.artist_id = ?
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `;

    const [rows] = await db.execute(query, [artistId]);
    return rows.map((album) => ({
      ...album,
      total_songs: parseInt(album.total_songs) || 0,
    }));
  }

  static async getAlbumWithSongs(albumId, artistId) {
    const connection = await db.getConnection();
    try {
      const [albumRows] = await connection.execute(
        "SELECT * FROM artist_albums WHERE id = ? AND artist_id = ?",
        [albumId, artistId]
      );

      if (albumRows.length === 0) {
        return null;
      }

      const album = albumRows[0];

      const [songRows] = await connection.execute(
        `
        SELECT s.*, aas.track_number
        FROM artist_songs s
        JOIN artist_album_songs aas ON s.id = aas.song_id
        WHERE aas.album_id = ?
        ORDER BY aas.track_number
      `,
        [albumId]
      );

      album.songs = songRows;

      return album;
    } finally {
      connection.release();
    }
  }

  static async updateAlbum(albumId, albumData) {
    const { title, description, cover_image, release_date } = albumData;

    const query = `
      UPDATE artist_albums
      SET title = ?,
          description = ?,
          cover_image = ?,
          release_date = ?
      WHERE id = ?
    `;

    const [result] = await db.execute(query, [
      title,
      description,
      cover_image,
      release_date,
      albumId,
    ]);

    return result.affectedRows > 0;
  }

  static async deleteAlbum(albumId) {
    const query = "DELETE FROM artist_albums WHERE id = ?";
    const [result] = await db.execute(query, [albumId]);
    return result.affectedRows > 0;
  }

  static async removeSongFromAlbum(albumId, songId, artistId = null) {
    if (!albumId || !songId) {
      throw new Error('Thiếu thông tin albumId hoặc songId');
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Kiểm tra album và lấy thông tin album chính
      let albumQuery = `
        SELECT 
          aa.id as artist_album_id,
          aa.title,
          aa.artist_id,
          a.id as main_album_id
        FROM artist_albums aa
        LEFT JOIN albums a ON a.title = aa.title`;
      
      if (artistId) {
        albumQuery += ' WHERE aa.id = ? AND aa.artist_id = ?';
      } else {
        albumQuery += ' WHERE aa.id = ?';
      }

      const [albumInfo] = await connection.execute(
        albumQuery,
        artistId ? [albumId, artistId] : [albumId]
      );

      if (albumInfo.length === 0) {
        throw new Error('Album không tồn tại');
      }

      // 2. Lấy thông tin bài hát
      let songQuery = `
        SELECT 
          ars.id as artist_song_id,
          ars.title,
          ars.artist_id,
          s.id as main_song_id
        FROM artist_songs ars
        LEFT JOIN songs s ON s.title = ars.title
        LEFT JOIN song_artists sa ON s.id = sa.songID`;
      
      if (artistId) {
        songQuery += ' WHERE ars.id = ? AND ars.artist_id = ?';
      } else {
        songQuery += ' WHERE ars.id = ?';
      }

      const [songInfo] = await connection.execute(
        songQuery,
        artistId ? [songId, artistId] : [songId]
      );

      if (songInfo.length === 0) {
        throw new Error('Không tìm thấy bài hát');
      }

      // 3. Xóa khỏi artist_album_songs
      await connection.execute(
        'DELETE FROM artist_album_songs WHERE album_id = ? AND song_id = ?',
        [albumId, songId]
      );

      // 4. Nếu có bài hát và album trong hệ thống chính, xóa khỏi song_albums
      if (songInfo[0].main_song_id && albumInfo[0].main_album_id) {
        await connection.execute(
          'DELETE FROM song_albums WHERE songID = ? AND albumID = ?',
          [songInfo[0].main_song_id, albumInfo[0].main_album_id]
        );
      }

      await connection.commit();
      return {
        success: true,
        message: 'Xóa bài hát khỏi album thành công'
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async verifyAlbumOwnership(albumId, artistId) {
    const [rows] = await db.execute(
      `
      SELECT * FROM artist_albums 
      WHERE id = ? AND artist_id = ?
    `,
      [albumId, artistId]
    );

    return rows.length > 0;
  }
}

module.exports = ArtistAlbumModel;
