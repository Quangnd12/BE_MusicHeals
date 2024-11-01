const db = require('../config/db');

class ArtistModel {

  static async getAllArtist() {
    const query = 'SELECT * FROM artists';
    const [rows] = await db.execute(query);
    return rows;
  }


  static async getArtistById(id) {
    const query = 'SELECT * FROM artists WHERE id = ?';
    const [rows] = await db.execute(query, [id]);
    return rows[0]; // Trả về artist đầu tiên tìm thấy
  }


  static async createArtist(artistData) {
    const { name, avatar, role, biography } = artistData;

    const checkQuery = 'SELECT * FROM artists WHERE name = ?';
    const [checkRows] = await db.execute(checkQuery, [name]);

    if (checkRows.length > 0) {
      throw new Error('Artist with this name already exists'); 
    }

    const query = 'INSERT INTO artists (name, avatar, role, biography) VALUES (?, ?, ?, ?)';
    const [result] = await db.execute(query, [name, avatar, role, biography]);
    return result.insertId; 
  }


  static async updateArtist(id, artistData) {
    const { name, avatar, role, biography } = artistData;

    const existingArtist = await db.execute('SELECT * FROM artists WHERE name = ? AND id != ?', [name, id]);
    if (existingArtist[0].length > 0) {
      throw new Error('An artist with this name already exists');
    }

    const query = 'UPDATE artists SET name = ?, avatar = ?, role = ?, biography = ? WHERE id = ?';
    await db.execute(query, [name, avatar, role, biography, id]);
  }


  static async deleteArtist(id) {
    const query = 'DELETE FROM artists WHERE id = ?';
    await db.execute(query, [id]);
  }
  
}

module.exports = ArtistModel;
