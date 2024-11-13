const db = require('../config/db');

class ArtistModel {

  static async getAllArtist(page = 1, limit = 4) {  // Đặt limit mặc định là 15
    const offset = (page - 1) * limit;
    const query = `SELECT 
      id,
      name,
      avatar,
      role,
      biography
      FROM artists
      LIMIT ${limit} OFFSET ${offset}`;
    const [rows] = await db.execute(query);
    return rows;
  }

 
  static async getArtistCount() {
    const query = 'SELECT COUNT(*) as count FROM artists';
    const [rows] = await db.execute(query);
    return rows[0].count;
  }

  static async getArtistById(id) {
    const query = 'SELECT * FROM artists WHERE id = ?';
    const [rows] = await db.execute(query, [id]);
    return rows[0]; // Trả về artist đầu tiên tìm thấy
  }

  

  static async createArtist(artistData) {
    const { name, avatar = null, role, biography = null } = artistData;
  
    const checkQuery = 'SELECT * FROM artists WHERE name = ?';
    const [checkRows] = await db.execute(checkQuery, [name]);
  
    if (checkRows.length > 0) {
      throw new Error('Artist with this name already exists');
    }
  
    // Thêm nghệ sĩ vào bảng artists
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

  static async searchArtistsByName(name) {
    const query = `
      SELECT id, name, avatar, role, biography
      FROM artists
      WHERE LOWER(name) LIKE ?`; // Dùng LOWER để không phân biệt hoa thường
  
    // Thay đổi cách xử lý khoảng trắng và tên tìm kiếm
    const searchName = `%${name.trim().toLowerCase()}%`; // Loại bỏ khoảng trắng đầu và cuối, nhưng giữ nguyên khoảng trắng giữa các từ
    const [rows] = await db.execute(query, [searchName]); // Truyền tên đã chỉnh sửa vào câu truy vấn
    return rows;
  }
}




module.exports = ArtistModel;
