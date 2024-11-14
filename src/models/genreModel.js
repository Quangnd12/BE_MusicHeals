const db = require('../config/db');

class GenreModel {

  static async getAllGenres(pagination = false, page, limit, countryID, searchName) {
    let query = `
      SELECT 
        genres.id,
        genres.name,
        genres.image,
        countries.name as country
      FROM genres
      JOIN countries
      ON countries.id = genres.countryID
    `;
    
    const conditions = [];
    if (countryID && countryID.length > 0) {
      conditions.push(`genres.countryID IN (${countryID.join(',')})`);
    }
  
    // Thêm điều kiện tìm kiếm theo tên nếu có
    if (searchName) {
      conditions.push(`genres.name LIKE ?`);
    }

    // Kết hợp các điều kiện WHERE nếu có bất kỳ điều kiện nào
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
  
    // Nếu có phân trang, thêm LIMIT và OFFSET
    if (pagination) {
      const offset = (page - 1) * limit;
      query += ` LIMIT ${limit} OFFSET ${offset}`;
    }
  
    // Thực hiện truy vấn với giá trị cho `searchName` nếu có
    const params = searchName ? [`%${searchName}%`] : [];
    const [rows] = await db.execute(query, params);
    return rows;
}

  

  static async getGenreCount() {
    const query = 'SELECT COUNT(*) as count FROM genres';
    const [rows] = await db.execute(query);
    return rows[0].count;
  }

    static async getGenreByImage() {
    const query = 'SELECT genres.image FROM genres';
    const [rows] = await db.execute(query);
    return rows;
  }

static async getGenreCountByCountry(ids) {
  const placeholders = ids.map(() => '?').join(', ');
  const query = `SELECT COUNT(*) as count FROM genres WHERE countryID IN (${placeholders})`;
  const [rows] = await db.execute(query, ids);
  return rows[0].count;
}

  static async getGenreById(id) {
    const query = 'SELECT  genres.id, genres.name,genres.image, countries.id as countryID, countries.name as countryName FROM genres JOIN countries ON countries.id=genres.countryID WHERE genres.id = ?';
    const [rows] = await db.execute(query, [id]);
    return rows[0];
  }


  static async createGenre(genreData) {
    const { countryID, name, image } = genreData;
  
    try {
      // Kiểm tra xem thể loại đã tồn tại với tên này chưa
      const checkQuery = 'SELECT * FROM genres WHERE name = ?';
      const [existingGenre] = await db.execute(checkQuery, [name]);
  
      if (existingGenre.length > 0) {
        throw new Error('Genre name already exists'); // Nếu tên thể loại đã tồn tại
      }
  
      // Nếu chưa tồn tại, thực hiện thêm mới thể loại
      const query = 'INSERT INTO genres (countryID, name, image) VALUES (?, ?, ?)';
      const [result] = await db.execute(query, [countryID, name, image]);
      
      return result.insertId; // Trả về ID của thể loại vừa thêm
    } catch (error) {
      throw new Error(`Error creating genre: ${error.message}`); // Bắt lỗi và ném lại thông báo lỗi
    }
  }
  
  static async updateGenre(id, genreData) {
    const { countryID, name, image } = genreData;
  
    try {
      // Kiểm tra xem thể loại với tên mới đã tồn tại hay chưa (không tính thể loại hiện tại)
      const checkQuery = 'SELECT * FROM genres WHERE name = ? AND id != ?';
      const [existingGenre] = await db.execute(checkQuery, [name, id]);
  
      if (existingGenre.length > 0) {
        throw new Error('Genre name already exists'); // Nếu tên thể loại đã tồn tại
      }
  
      // Nếu tên chưa tồn tại, thực hiện cập nhật thể loại
      const query = 'UPDATE genres SET countryID = ?, name = ?, image = ? WHERE id = ?';
      await db.execute(query, [countryID, name, image, id]);
  
    } catch (error) {
      throw new Error(`Error updating genre: ${error.message}`); // Bắt lỗi và ném lại thông báo lỗi
    }
  }
  

  static async deleteGenre(id) {
    const query = 'DELETE FROM genres WHERE id = ?';
    await db.execute(query, [id]);
  }
}

module.exports = GenreModel;
