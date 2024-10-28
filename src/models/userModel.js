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

  static async getPaginatedUsers(page = 1) {
    const limit = 5; // Số lượng bản ghi mỗi trang
    const offset = (page - 1) * limit;

    const query = "SELECT * FROM users LIMIT ? OFFSET ?";
    const [rows] = await db.execute(query, [limit, offset]);

    return rows;
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

  static async getAllUsers() {
    const query = "SELECT * FROM users";
    const [rows] = await db.execute(query);
    return rows;
  }

  static async getUserByEmail(email) {
    const query = "SELECT * FROM users WHERE email = ?";
    const [rows] = await db.execute(query, [email]);
    return rows[0]; // Trả về người dùng đầu tiên tìm thấy
  }

  static async updateUser(id, userData) {
    const {
      username = null,
      password = null,
      birthday = null,
      avatar = null,
  } = userData;

    // Kiểm tra nếu có mật khẩu mới thì mã hóa mật khẩu, nếu không giữ nguyên
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const query =
      "UPDATE users SET username = ?, password = COALESCE(?, password), birthday = ?, avatar = ?,  updatedAt = CURRENT_TIMESTAMP WHERE id = ?";
    await db.execute(query, [
      username,
      hashedPassword, // Sử dụng mật khẩu đã mã hóa (nếu có)
      birthday,
      avatar,
      id,
    ]);
  }

  static async updateUserAvatar(userId, avatarUrl) {
    const query = "UPDATE users SET avatar = ?, updatedAt = CURRENT_TIMESTAMP  WHERE id = ?";
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
    const query = "UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?";
    await db.execute(query, [hashedPassword, id]);
  }

  static async clearResetToken(id) {
    const query =
      "UPDATE users SET resetToken = NULL, resetTokenExpiry = NULL, updatedAt = CURRENT_TIMESTAMP WHERE id = ?";
    await db.execute(query, [id]);
  }
}

module.exports = UserModel;
