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
        ) as artistNames
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
      artistNames: row.artistNames ? row.artistNames.split(',') : []
    }));
  }

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

  // Các phương thức khác giữ nguyên
  static async getAlbumById(id) {
    const query = `
      SELECT 
        albums.*,
        (SELECT name FROM artists WHERE id = albums.artistID) as artistName
      FROM albums
      WHERE albums.id = ?
    `;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
  }

  static async createAlbum(albumData) {
    const { title, image, artistID, releaseDate } = albumData;
    const formattedArtistID = Array.isArray(artistID) ? parseInt(artistID[0], 10) : parseInt(artistID, 10);

    const query = 'INSERT INTO albums (title, image, artistID, releaseDate) VALUES (?, ?, ?, ?)';
    const [result] = await db.execute(query, [title, image, formattedArtistID, releaseDate]);

    // Nếu có nhiều artistID, thêm vào bảng album_artists
    if (Array.isArray(artistID) && artistID.length > 1) {
      const albumId = result.insertId;
      const additionalArtists = artistID.slice(1);
      
      for (const additionalArtistId of additionalArtists) {
        await db.execute(
          'INSERT INTO album_artists (albumID, artistID) VALUES (?, ?)',
          [albumId, parseInt(additionalArtistId, 10)]
        );
      }
    }

    return result.insertId;
  }

  static async updateAlbum(id, albumData) {
    const { title, image, artistID, releaseDate } = albumData;
    const formattedArtistID = Array.isArray(artistID) ? parseInt(artistID[0], 10) : parseInt(artistID, 10);

    const query = 'UPDATE albums SET title = ?, image = ?, artistID = ?, releaseDate = ? WHERE id = ?';
    await db.execute(query, [title, image, formattedArtistID, releaseDate, id]);

    // Cập nhật các artist phụ
    if (Array.isArray(artistID) && artistID.length > 1) {
      // Xóa tất cả các liên kết artist cũ
      await db.execute('DELETE FROM album_artists WHERE albumID = ?', [id]);
      
      // Thêm các artist mới
      const additionalArtists = artistID.slice(1);
      for (const additionalArtistId of additionalArtists) {
        await db.execute(
          'INSERT INTO album_artists (albumID, artistID) VALUES (?, ?)',
          [id, parseInt(additionalArtistId, 10)]
        );
      }
    }
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
}




module.exports = AlbumModel;