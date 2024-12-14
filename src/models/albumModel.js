// albumModel.js
const db = require('../config/db');

class AlbumModel {
  static async getAllAlbums(pagination = false, page, limit, searchTerm) {
    let query = `
      SELECT 
        a.id,
        a.title,
        a.image,
        a.releaseDate,
        IFNULL(
          GROUP_CONCAT(DISTINCT ar.id),
          a.artistID
        ) as artistIDs,
        IFNULL(
          GROUP_CONCAT(DISTINCT ar.name),
          (SELECT name FROM artists WHERE id = a.artistID)
        ) as artistNames,
        IFNULL(
          GROUP_CONCAT(DISTINCT ar.avatar),
          (SELECT avatar FROM artists WHERE id = a.artistID)
        ) as artistAvatars
      FROM albums a
      LEFT JOIN album_artists aa ON a.id = aa.albumID
      LEFT JOIN artists ar ON ar.id = aa.artistID OR ar.id = a.artistID
    `;
  
    // Chỉ thêm điều kiện search nếu có searchTerm
    if (searchTerm) {
      query += ` WHERE LOWER(a.title) LIKE LOWER(?)`;
    }
  
    query += ` GROUP BY a.id, a.title, a.image, a.releaseDate, a.artistID`;
  
    if (pagination) {
      const offset = (page - 1) * limit;
      query += ` LIMIT ${limit} OFFSET ${offset}`;
    }
  
    const params = searchTerm ? [`%${searchTerm}%`] : [];
    const [rows] = await db.execute(query, params);
  
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      image: row.image,
      releaseDate: row.releaseDate,
      artistIDs: row.artistIDs ? row.artistIDs.split(',').map(id => parseInt(id)) : [],
      artistNames: row.artistNames ? row.artistNames.split(',') : [],
      artistAvatars: row.artistAvatars ? row.artistAvatars.split(',') : []
    }));
  }

  // Đồng thời cập nhật hàm getAlbumCount
  static async getAlbumCount(searchTerm) {
    let query = `
    SELECT COUNT(DISTINCT a.id) as count 
    FROM albums a
    LEFT JOIN album_artists aa ON a.id = aa.albumID
    LEFT JOIN artists ar ON ar.id = aa.artistID OR ar.id = a.artistID
  `;

    if (searchTerm) {
      query += ' WHERE LOWER(a.title) LIKE LOWER(?)';
    }

    const params = searchTerm ? [`%${searchTerm}%`] : [];
    const [rows] = await db.execute(query, params);
    return rows[0].count;
  }

  static async getAlbumById(id) {
    const query = `
      SELECT 
        a.*,
        art.id as artistId,
        art.name as artistName,
        art.avatar as artistAvatar, -- Thêm cột avatar
        s.id as songId,
        s.title as songTitle,
        s.duration as songDuration,
        s.file_song as songFile,
        s.image as songImage,
        s.lyrics as songLyrics,
        s.releaseDate as songReleaseDate,
        s.is_premium as songIsPremium,
        s.listens_count as songListensCount,
        s.is_explicit as songIsExplicit,
        GROUP_CONCAT(DISTINCT sa.artistId) as songArtistIds,
        GROUP_CONCAT(DISTINCT art2.name) as songArtistNames
      FROM albums a
      LEFT JOIN artists art ON a.artistID = art.id -- Lấy thông tin nghệ sĩ chính
      LEFT JOIN song_albums sa_album ON a.id = sa_album.albumID
      LEFT JOIN songs s ON sa_album.songID = s.id
      LEFT JOIN song_artists sa ON s.id = sa.songID
      LEFT JOIN artists art2 ON sa.artistId = art2.id -- Lấy thông tin nghệ sĩ khác nếu có
      WHERE a.id = ?
      GROUP BY a.id, s.id
    `;
    
    const [rows] = await db.execute(query, [id]);
    
    if (rows.length === 0) return null;
  
    // Xử lý kết quả để tạo cấu trúc album với danh sách bài hát
    const album = {
      id: rows[0].id,
      title: rows[0].title,
      image: rows[0].image,
      releaseDate: rows[0].releaseDate,
      artistName: rows[0].artistName,
      artistAvatar: rows[0].artistAvatar, // Thêm thông tin avatar
      songs: rows[0].songId ? rows.map(row => ({
        id: row.songId,
        title: row.songTitle,
        duration: row.songDuration,
        file: row.songFile,
        image: row.songImage,
        lyrics: row.songLyrics,
        releaseDate: row.songReleaseDate,
        is_premium: row.songIsPremium,
        listens_count: row.songListensCount,
        is_explicit: row.songIsExplicit,
        artistIds: row.songArtistIds ? row.songArtistIds.split(',').map(Number) : [],
        artistNames: row.songArtistNames ? row.songArtistNames.split(',') : []
      })) : []
    };
  
    return album;
}


  static async createAlbum(albumData) {
    const { title, image, artistID, releaseDate } = albumData;
    const formattedArtistID = Array.isArray(artistID) ? parseInt(artistID[0], 10) : parseInt(artistID, 10);

    const checkQuery = 'SELECT * FROM albums WHERE title = ? AND artistID = ?';
    const [checkRows] = await db.execute(checkQuery, [title, formattedArtistID]);

    if (checkRows.length > 0) {
      throw new Error('Album with this title already exists for this artist');
    }

    const query = 'INSERT INTO albums (title, image, artistID, releaseDate) VALUES (?, ?, ?, ?)';
    const [result] = await db.execute(query, [title, image, formattedArtistID, releaseDate]);
    return result.insertId;
  }

  static async updateAlbum(id, albumData) {
    const { title, image, artistID, releaseDate } = albumData;
    const formattedArtistID = Array.isArray(artistID) ? parseInt(artistID[0], 10) : parseInt(artistID, 10);

    const existingAlbum = await db.execute(
      'SELECT * FROM albums WHERE title = ? AND artistID = ? AND id != ?',
      [title, formattedArtistID, id]
    );
    if (existingAlbum[0].length > 0) {
      throw new Error('An album with this title already exists for this artist');
    }

    const query = 'UPDATE albums SET title = ?, image = ?, artistID = ?, releaseDate = ? WHERE id = ?';
    await db.execute(query, [title, image, formattedArtistID, releaseDate, id]);
  }

  static async deleteAlbum(id) {
    const query = 'DELETE FROM albums WHERE id = ?';
    await db.execute(query, [id]);
  }

  static async searchAlbumsByTitle(searchTerm, limit = 10) {
    const query = `
      SELECT * FROM albums 
      WHERE title LIKE ?
      ORDER BY releaseDate DESC
      LIMIT ?
    `;
    const [rows] = await db.execute(query, [`%${searchTerm}%`, limit]);
    return rows;
  }

  static async getThisMonthAlbums() {
    const query = `
      SELECT * FROM albums 
      WHERE MONTH(releaseDate) = MONTH(CURRENT_DATE()) 
      AND YEAR(releaseDate) = YEAR(CURRENT_DATE())
      ORDER BY releaseDate DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
  }

  static async searchAlbums(searchTerm, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      const searchPattern = `%${searchTerm}%`;
      
      const query = `
        SELECT 
          a.*,
          GROUP_CONCAT(DISTINCT ar.name) as artistNames,
          GROUP_CONCAT(DISTINCT ar.avatar) as artistAvatars,
          COUNT(DISTINCT s.id) as totalSongs
        FROM albums a
        LEFT JOIN album_artists aa ON a.id = aa.albumID
        LEFT JOIN artists ar ON aa.artistID = ar.id
        LEFT JOIN song_albums sa ON a.id = sa.albumID
        LEFT JOIN songs s ON sa.songID = s.id
        WHERE LOWER(a.title) LIKE LOWER(${db.escape(searchPattern)})
        GROUP BY a.id
        ORDER BY a.releaseDate DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;

      const [rows] = await db.execute(query);

      return rows.map(row => ({
        id: row.id,
        title: row.title,
        image: row.image,
        releaseDate: row.releaseDate,
        totalSongs: row.totalSongs,
        artists: {
          names: row.artistNames ? row.artistNames.split(',') : [],
          avatars: row.artistAvatars ? row.artistAvatars.split(',') : []
        }
      }));

    } catch (error) {
      console.error("Lỗi khi tìm kiếm album:", error);
      throw error;
    }
  }

}

module.exports = AlbumModel;