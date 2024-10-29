const db = require('../config/db');

class AlbumModel {
  // Lấy tất cả albums
  static async getAllAlbums() {
    const query = 'SELECT * FROM albums';
    const [rows] = await db.execute(query);
    return rows;
  }

  // Lấy album theo ID
  static async getAlbumById(id) {
    const query = 'SELECT * FROM albums WHERE id = ?';
    const [rows] = await db.execute(query, [id]);
    return rows[0]; // Trả về album đầu tiên tìm thấy
  }

  // Tạo album mới
  static async createAlbum(albumData) {
    const { title, image, artistID, releaseDate } = albumData;
    const query = 'INSERT INTO albums (title, image, artistID, releaseDate) VALUES (?, ?, ?, ?)';
    const [result] = await db.execute(query, [title, image, artistID, releaseDate]);
    return result.insertId; // Trả về ID của album mới tạo
  }

  // Cập nhật album theo ID
  static async updateAlbum(id, albumData) {
    const { title, image, artistID, releaseDate } = albumData;
    const query = 'UPDATE albums SET title = ?, image = ?, artistID = ?, releaseDate = ? WHERE id = ?';
    await db.execute(query, [title, image, artistID, releaseDate, id]);
  }

  // Xóa album theo ID
  static async deleteAlbum(id) {
    const query = 'DELETE FROM albums WHERE id = ?';
    await db.execute(query, [id]);
  }
}

module.exports = AlbumModel;
