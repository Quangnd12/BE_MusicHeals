const db = require('../config/db');

class GenreModel {

  static async getAllGenres(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const query = `SELECT * FROM genres LIMIT ${limit} OFFSET ${offset}`;
    const [rows] = await db.execute(query);
    return rows;
  }

  static async getGenreCount() {
    const query = 'SELECT COUNT(*) as count FROM genres';
    const [rows] = await db.execute(query);
    return rows[0].count;
  }

  static async getGenreById(id) {
    const query = 'SELECT * FROM genres WHERE id = ?';
    const [rows] = await db.execute(query, [id]);
    return rows[0];
  }


  static async createGenre(genreData) {
    const { countryID, name } = genreData;

    const query = 'INSERT INTO genres (countryID, name) VALUES (?, ?)';
    const [result] = await db.execute(query, [countryID, name]);
    return result.insertId;
  }


  static async updateGenre(id, genreData) {
    const { countryID, name } = genreData;
    const query = 'UPDATE genres SET countryID = ?, name = ? WHERE id = ?';
    await db.execute(query, [countryID, name, id]);
  }

  static async deleteGenre(id) {
    const query = 'DELETE FROM genres WHERE id = ?';
    await db.execute(query, [id]);
  }
}

module.exports = GenreModel;
