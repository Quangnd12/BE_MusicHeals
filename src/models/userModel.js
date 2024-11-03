const db = require("../config/db");
const bcrypt = require("bcryptjs");

class UserModel {
  static async createUser(userData) {
    const {
      username = null,
      password,
      role,
      birthday = null,
      email,
      avatar = null,
    } = userData;

    // Kiểm tra xem email đã được sử dụng chưa
    const emailUsed = await UserModel.isEmailUsed(email);
    if (emailUsed) {
      throw new Error("Email đã được sử dụng"); // Ném ra lỗi nếu email đã tồn tại
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    const query =
      "INSERT INTO users (username, password, role, birthday, email, avatar) VALUES (?, ?, ?, ?, ?, ?)";
    const [result] = await db.execute(query, [
      username,
      hashedPassword,
      role,
      birthday,
      email,
      avatar,
    ]);
    return result.insertId;
  }

  static async createUserWithGoogle(userData) {
    const { username = null, email, avatar = null, role } = userData;

    // Kiểm tra xem email đã được sử dụng chưa
    const emailUsed = await UserModel.isEmailUsed(email);
    if (emailUsed) {
      throw new Error("Email đã được sử dụng"); // Ném ra lỗi nếu email đã tồn tại
    }

    // Tạo người dùng mới mà không cần mật khẩu
    const query =
      "INSERT INTO users (username, password, role, email, avatar) VALUES (?, NULL, ?, ?, ?)";
    const [result] = await db.execute(query, [username, role, email, avatar]);

    return result.insertId;
  }

  static async getTotalUsersCount() {
    const query = "SELECT COUNT(*) as count FROM users";
    const [rows] = await db.execute(query);
    return rows[0].count; // Trả về tổng số người dùng
  }

  static async getUserById(id) {
    const query = "SELECT * FROM users WHERE id = ?";
    const [rows] = await db.execute(query, [id]);
    return rows[0];
  }

  static async getAllUsers({
    page = 1, // bắt đầu từ 1 cho dễ sử dụng
    limit = 5,
    search = "",
    sort = "username", // Đảm bảo cột mặc định tồn tại trong bảng
    order = "ASC",
  }) {
    try {
      let query = "SELECT * FROM users";
      let countQuery = "SELECT COUNT(*) as total FROM users";
      const params = [];

      // Thêm điều kiện tìm kiếm nếu có search term
      if (search) {
        const searchCondition = " WHERE username LIKE ? OR email LIKE ?";
        query += searchCondition;
        countQuery += searchCondition;
        params.push(`%${search}%`, `%${search}%`);
      }

      // Thêm sắp xếp
      query += ` ORDER BY ${sort} ${order}`;

      // Lấy tổng số lượng cho phân trang
      const [countResult] = await db.execute(countQuery, params);
      const total = countResult[0].total;

      // Áp dụng phân trang nếu page > 0
      if (page > 0) {
        const offset = (page - 1) * limit;
        query += ` LIMIT ${limit} OFFSET ${offset}`; // Truyền trực tiếp LIMIT và OFFSET vào query
      }

      // Thực thi câu truy vấn
      const [users] = await db.execute(query, params);

      // Trả về dữ liệu
      return {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit,
      };
    } catch (error) {
      console.error("Database error:", error);
      console.error("Error stack:", error.stack); // In chi tiết lỗi
      throw new Error("Error retrieving users from database");
    }
  }

  static async getUserByEmail(email) {
    if (email === undefined) throw new Error("Email không được để trống");
    const query = "SELECT * FROM users WHERE email = ?";
    const [rows] = await db.execute(query, [email]);
    return rows[0];
  }

  // userModel.js
  static async updateUser(id, userData) {
    const {
      username = null,
      password = null,
      birthday = null,
      avatar = null,
      updatedAt = null, // Nhận updatedAt từ userData
    } = userData;

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const query = `
      UPDATE users 
      SET username = ?, 
          password = COALESCE(?, password), 
          birthday = ?, 
          avatar = ?, 
          updatedAt = ? 
      WHERE id = ?`;

    await db.execute(query, [
      username,
      hashedPassword,
      birthday,
      avatar,
      updatedAt, // Truyền updatedAt vào SQL
      id,
    ]);
  }

  static async updateUserAvatar(userId, avatarUrl) {
    const query =
      "UPDATE users SET avatar = ?, updatedAt = CURRENT_TIMESTAMP  WHERE id = ?";
    await db.execute(query, [avatarUrl, userId]);
  }

  static async getUserAvatar(userId) {
    const query = "SELECT avatar FROM users WHERE id = ?";
    const [rows] = await db.execute(query, [userId]);
    return rows[0]?.avatar || null;
  }

  static async deleteUser(id) {
    const query = "DELETE FROM users WHERE id = ?";
    await db.execute(query, [id]);
  }

  static async isEmailUsed(email) {
    const query = "SELECT * FROM users WHERE email = ?";
    const [rows] = await db.execute(query, [email]);
    return rows.length > 0; // Trả về true nếu có ít nhất một người dùng với email này
  }

  static async setResetToken(id, resetTokenHash, resetTokenExpiry) {
    const query =
      "UPDATE users SET resetToken = ?, resetTokenExpiry = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?";
    await db.execute(query, [resetTokenHash, resetTokenExpiry, id]);
  }

  static async getUserByResetToken(resetTokenHash) {
    const query = "SELECT * FROM users WHERE resetToken = ?";
    const [rows] = await db.execute(query, [resetTokenHash]);
    return rows[0];
  }

  static async updatePassword(id, hashedPassword) {
    const query =
      "UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?";
    await db.execute(query, [hashedPassword, id]);
  }

  static async clearResetToken(id) {
    const query =
      "UPDATE users SET resetToken = NULL, resetTokenExpiry = NULL, updatedAt = CURRENT_TIMESTAMP WHERE id = ?";
    await db.execute(query, [id]);
  }
}

module.exports = UserModel;
