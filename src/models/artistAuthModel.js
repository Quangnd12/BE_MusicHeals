const db = require("../config/db");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { admin } = require("../config/firebase");

class ArtistAuthModel {
  // Tạo mật khẩu ngẫu nhiên
  static generateRandomPassword(length = 12) {
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    return password;
  }
  // Tạo mới tài khoản nghệ sĩ
  static async createArtistUser(artistData) {
    const {
      email,
      password,
      stage_name,
      avatar = "https://storage.googleapis.com/music-app/default-artist-avatar.png",
      biography = "",
      role = 1
    } = artistData;

    // Kiểm tra email đã tồn tại
    const emailUsed = await this.isEmailUsed(email);
    if (emailUsed) {
      throw new Error("Email already in use");
    }

    // Hash mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Bắt đầu transaction
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Thêm vào bảng artists trước
      const artistQuery = `
        INSERT INTO artists (name, avatar, role, biography)
        VALUES (?, ?, ?, ?)
      `;
      const [artistResult] = await connection.execute(artistQuery, [
        stage_name,
        avatar,
        role,
        biography
      ]);

      const artistId = artistResult.insertId;

      // 2. Thêm vào bảng artist_users
      const userQuery = `
        INSERT INTO artist_users 
        (artist_id, email, password, stage_name, avatar)
        VALUES (?, ?, ?, ?, ?)
      `;
      const [userResult] = await connection.execute(userQuery, [
        artistId,
        email,
        hashedPassword,
        stage_name,
        avatar
      ]);

      await connection.commit();
      return {
        artistId: artistId,
        userId: userResult.insertId
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async createArtistUserWithGoogle(googleToken, artistData) {
    const { 
      email, 
      stage_name, 
      avatar,
      biography = "",
      role = 1
    } = artistData;

    try {
      // Xác thực token từ Firebase
      const firebaseUser = await admin.auth().verifyIdToken(googleToken);
      
      // Kiểm tra email đã tồn tại
      const emailUsed = await this.isEmailUsed(email);
      if (emailUsed) {
        throw new Error("Email already in use");
      }

      // Tạo mật khẩu ngẫu nhiên
      const randomPassword = this.generateRandomPassword();
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      // Bắt đầu transaction
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();

        // 1. Thêm vào bảng artists
        const artistQuery = `
          INSERT INTO artists (name, avatar, role, biography)
          VALUES (?, ?, ?, ?)
        `;
        const [artistResult] = await connection.execute(artistQuery, [
          stage_name,
          avatar || "https://storage.googleapis.com/music-app/default-artist-avatar.png",
          role,
          biography
        ]);

        const artistId = artistResult.insertId;

        // 2. Thêm vào bảng artist_users
        const userQuery = `
          INSERT INTO artist_users 
          (artist_id, email, password, stage_name, avatar)
          VALUES (?, ?, ?, ?, ?)
        `;
        const [userResult] = await connection.execute(userQuery, [
          artistId,
          email,
          hashedPassword,
          stage_name,
          avatar || "https://storage.googleapis.com/music-app/default-artist-avatar.png"
        ]);

        await connection.commit();
        return {
          artistId: artistId,
          userId: userResult.insertId,
          randomPassword
        };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      throw new Error("Google authentication failed: " + error.message);
    }
  }

    // Đăng nhập nghệ sĩ với Google
    static async loginArtistWithGoogle(googleToken) {
        try {
          // Xác thực token từ Firebase
          const firebaseUser = await admin.auth().verifyIdToken(googleToken);
    
          // Lấy thông tin nghệ sĩ từ email
          const artist = await this.getArtistByEmail(firebaseUser.email);
          if (!artist) {
            throw new Error("Artist not found");
          }
    
          return artist;
        } catch (error) {
          throw new Error("Google authentication failed: " + error.message);
        }
      }

  // Lấy thông tin nghệ sĩ qua email
static async getArtistByEmail(email) {
  const query = `
    SELECT 
      au.*,
      a.id as artist_id,
      a.name as artist_name,
      a.biography,
      a.role
    FROM artist_users au
    LEFT JOIN artists a ON au.artist_id = a.id
    WHERE au.email = ?
  `;

  const [rows] = await db.execute(query, [email]);
  
  if (rows.length === 0) {
    return null;
  }
  
  return {
    id: rows[0].id,
    email: rows[0].email,
    password: rows[0].password,
    stage_name: rows[0].stage_name,
    avatar: rows[0].avatar,
    artist_id: rows[0].artist_id,
    artist_name: rows[0].artist_name,
    biography: rows[0].biography,
    role: rows[0].role
  };
}


  // Kiểm tra email đã được sử dụng
  static async isEmailUsed(email) {
    const query = "SELECT * FROM artist_users WHERE email = ?";
    const [rows] = await db.execute(query, [email]);
    return rows.length > 0;
  }

  static async getArtistByStageName(stageName, excludeArtistId = null) {
    let query = `
      SELECT au.* 
      FROM artist_users au
      WHERE au.stage_name = ?
    `;
    const params = [stageName];

    if (excludeArtistId) {
      query += ' AND au.artist_id != ?';
      params.push(excludeArtistId);
    }

    const [rows] = await db.execute(query, params);
    return rows.length > 0 ? rows[0] : null;
  }
  
  // Thêm phương thức lấy thông tin artist theo user_id
  static async getArtistByUserId(userId) {
    const query = `
      SELECT au.*, a.name as artist_name, a.biography, a.role
      FROM artist_users au
      LEFT JOIN artists a ON au.artist_id = a.id
      WHERE au.id = ?
    `;
  
    const [rows] = await db.execute(query, [userId]);
    return rows.length > 0 ? rows[0] : null;
  }

  // Cập nhật thông tin hồ sơ nghệ sĩ
  static async updateArtistProfile(artistId, updateData) {
    if (!artistId) {
      throw new Error('Artist ID is required');
    }

    const connection = await db.getConnection();
  
    try {
      await connection.beginTransaction();

      // Lọc bỏ các giá trị undefined và null
      const cleanUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined && value !== null)
      );

      console.log('Clean update data:', cleanUpdateData);

      // Cập nhật bảng artist_users
      if (cleanUpdateData.stage_name || cleanUpdateData.avatar) {
        const userFields = [];
        const userValues = [];

        if (cleanUpdateData.stage_name) {
          userFields.push("stage_name = ?");
          userValues.push(cleanUpdateData.stage_name);
        }
        if (cleanUpdateData.avatar) {
          userFields.push("avatar = ?");
          userValues.push(cleanUpdateData.avatar);
        }

        if (userFields.length > 0) {
          userValues.push(artistId);

          const userQuery = `
            UPDATE artist_users 
            SET ${userFields.join(", ")}
            WHERE artist_id = ?
          `;

          await connection.execute(userQuery, userValues);
        }
      }

      // Cập nhật bảng artists
      if (cleanUpdateData.stage_name || cleanUpdateData.biography || cleanUpdateData.role || cleanUpdateData.avatar) {
        const artistFields = [];
        const artistValues = [];

        if (cleanUpdateData.stage_name) {
          artistFields.push("name = ?");
          artistValues.push(cleanUpdateData.stage_name);
        }
        if (cleanUpdateData.biography !== undefined) {
          artistFields.push("biography = ?");
          artistValues.push(cleanUpdateData.biography);
        }
        if (cleanUpdateData.role !== undefined) {
          artistFields.push("role = ?");
          artistValues.push(cleanUpdateData.role);
        }
        if (cleanUpdateData.avatar) {
          artistFields.push("avatar = ?");
          artistValues.push(cleanUpdateData.avatar);
        }

        if (artistFields.length > 0) {
          artistValues.push(artistId);

          const artistQuery = `
            UPDATE artists 
            SET ${artistFields.join(", ")}
            WHERE id = ?
          `;

          await connection.execute(artistQuery, artistValues);
        }
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Đổi mật khẩu nghệ sĩ
  static async updatePassword(email, hashedPassword) {
    const query = `
      UPDATE artist_users 
      SET password = ?,
          updatedAt = CURRENT_TIMESTAMP
      WHERE email = ?
    `;
    
    const [result] = await db.execute(query, [hashedPassword, email]);
    return result.affectedRows > 0;
  }

  // Tạo token reset mật khẩu
  static async createPasswordResetToken(email) {
    const artist = await this.getArtistByEmail(email);
    if (!artist) {
      throw new Error("Email not found");
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Cập nhật resetToken và resetTokenExpiry trong bảng artist_users
    const query = `
      UPDATE artist_users 
      SET resetToken = ?,
          resetTokenExpiry = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 HOUR)
      WHERE email = ?
    `;

    await db.execute(query, [hashedToken, email]);
    return resetToken;
  }

  // Đặt lại mật khẩu
  static async resetPassword(token, newPassword) {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Kiểm tra token trong bảng artist_users
    const query = `
      SELECT email 
      FROM artist_users 
      WHERE resetToken = ? 
      AND resetTokenExpiry > CURRENT_TIMESTAMP
    `;
    const [rows] = await db.execute(query, [hashedToken]);

    if (rows.length === 0) {
      throw new Error("Invalid or expired reset token");
    }

    const email = rows[0].email;
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu mới và xóa token
    const updateQuery = `
      UPDATE artist_users 
      SET password = ?,
          resetToken = NULL,
          resetTokenExpiry = NULL
      WHERE email = ?
    `;

    const [result] = await db.execute(updateQuery, [hashedPassword, email]);
    return result.affectedRows > 0;
  }

  // Thêm phương thức getArtistById
  static async getArtistById(artistId) {
    if (!artistId) {
      throw new Error('Artist ID is required');
    }

    const query = `
      SELECT 
        au.*,
        a.id as artist_id,
        a.name as artist_name,
        a.biography,
        a.role,
        a.avatar
      FROM artist_users au
      LEFT JOIN artists a ON au.artist_id = a.id
      WHERE a.id = ?
    `;

    try {
      const [rows] = await db.execute(query, [artistId]);
      if (rows.length === 0) {
        return null;
      }

      return {
        id: rows[0].id,
        email: rows[0].email,
        stage_name: rows[0].stage_name,
        artist_id: rows[0].artist_id,
        artist_name: rows[0].artist_name,
        biography: rows[0].biography,
        role: rows[0].role,
        avatar: rows[0].avatar
      };
    } catch (error) {
      console.error('Error getting artist by ID:', error);
      throw error;
    }
  }

  static async updateResetStatus(email) {
    const query = `
      UPDATE artist_users 
      SET resetTokenExpiry = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 HOUR)
      WHERE email = ?
    `;
    
    await db.execute(query, [email]);
  }
}

module.exports = ArtistAuthModel;
