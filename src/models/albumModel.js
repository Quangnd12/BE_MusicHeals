const db = require('../config/db');

class AlbumModel {

  static async getAllAlbums(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const query = `SELECT * FROM albums LIMIT ${limit} OFFSET ${offset}`;
    const [rows] = await db.execute(query);
    return rows;
  }

  static async getAlbumCount() {
    const query = 'SELECT COUNT(*) as count FROM albums';
    const [rows] = await db.execute(query);
    return rows[0].count;
  }

  static async getAlbumById(id) {
    const query = 'SELECT * FROM albums WHERE id = ?';
    const [rows] = await db.execute(query, [id]);
    return rows[0]; // Trả về album đầu tiên tìm thấy
  }

  static async createAlbum(albumData) {
    const { title, image, artistID, releaseDate } = albumData;

    const checkQuery = 'SELECT * FROM albums WHERE title = ? AND artistID = ?';
    const [checkRows] = await db.execute(checkQuery, [title, artistID]);

    if (checkRows.length > 0) {
      throw new Error('Album with this title already exists for this artist'); 
    }

    const query = 'INSERT INTO albums (title, image, artistID, releaseDate) VALUES (?, ?, ?, ?)';
    const [result] = await db.execute(query, [title, image, artistID, releaseDate]);
    return result.insertId; 
  }

  static async updateAlbum(id, albumData) {
    const { title, image, artistID, releaseDate } = albumData;

    const existingAlbum = await db.execute('SELECT * FROM albums WHERE title = ? AND artistID = ? AND id != ?', [title, artistID, id]);
    if (existingAlbum[0].length > 0) {
      throw new Error('An album with this title already exists for this artist');
    }

    const query = 'UPDATE albums SET title = ?, image = ?, artistID = ?, releaseDate = ? WHERE id = ?';
    await db.execute(query, [title, image, artistID, releaseDate, id]);
  }

  static async deleteAlbum(id) {
    const query = 'DELETE FROM albums WHERE id = ?';
    await db.execute(query, [id]);
  }
}

module.exports = AlbumModel;
