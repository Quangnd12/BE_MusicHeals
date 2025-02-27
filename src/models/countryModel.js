const db = require('../config/db');

class CountryModel {

  static async getAllCountries(pagination = false, page, limit, searchName) {

    let query = `SELECT * FROM countries`;

    const conditions = [];

    if (searchName) {
      conditions.push(`countries.name LIKE ?`);
    }
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    if (pagination) {
      const offset = (page - 1) * limit;
      query += ` LIMIT ${limit} OFFSET ${offset}`;
    }
    

    const params = [];
    if (searchName) params.push(`%${searchName}%`);
    const [rows] = await db.execute(query, params);
    return rows;

  }

  static async getCountryCount() {
    const query = 'SELECT COUNT(*) as count FROM countries';
    const [rows] = await db.execute(query);
    return rows[0].count;
  }

  static async getCountryById(id) {
    const query = 'SELECT * FROM countries WHERE id = ?';
    const [rows] = await db.execute(query, [id]);
    return rows[0];
  }

  static async createCountry(countryData) {
    const { name } = countryData;
    const query = 'INSERT INTO countries (name) VALUES (?)';
    const [result] = await db.execute(query, [name]);
    return result.insertId;
  }

  static async updateCountry(id, countryData) {
    const { name } = countryData;
    const query = 'UPDATE countries SET name = ? WHERE id = ?';
    await db.execute(query, [name, id]);
  }

  static async deleteCountry(id) {
    const query = 'DELETE FROM countries WHERE id = ?';
    await db.execute(query, [id]);
  }
}

module.exports = CountryModel;
