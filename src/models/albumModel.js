// albumModel.js
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
    return rows[0];
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


  static async searchAlbumsByTitle(searchTerm) {
    const query = `
      SELECT * FROM albums 
      WHERE title LIKE ?
      ORDER BY releaseDate DESC
    `;
    const [rows] = await db.execute(query, [`%${searchTerm}%`]);
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