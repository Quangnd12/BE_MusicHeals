const db = require('../config/db');

class FollowModel {
  // Theo dõi một nghệ sĩ
  static async followArtist(userId, artistId) {
    const connection = await db.getConnection();

    try {
      // Bắt đầu transaction
      await connection.beginTransaction();

      // Kiểm tra xem đã follow chưa
      const [existingFollow] = await connection.execute(
        'SELECT * FROM artist_follows WHERE userId = ? AND artistId = ?',
        [userId, artistId]
      );

      if (existingFollow.length > 0) {
        throw new Error('Bạn đã theo dõi nghệ sĩ này');
      }

      // Thêm follow mới
      const [result] = await connection.execute(
        'INSERT INTO artist_follows (userId, artistId, followedAt) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [userId, artistId]
      );

      // Commit transaction
      await connection.commit();

      return result.insertId;
    } catch (error) {
      // Rollback transaction nếu có lỗi
      await connection.rollback();
      throw error;
    } finally {
      // Giải phóng kết nối
      connection.release();
    }
  }

  // Hủy theo dõi nghệ sĩ
  static async unfollowArtist(userId, artistId) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Xóa follow
      await connection.execute(
        'DELETE FROM artist_follows WHERE userId = ? AND artistId = ?',
        [userId, artistId]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Kiểm tra trạng thái follow
  static async isFollowing(userId, artistId) {
    const [rows] = await db.execute(
      'SELECT * FROM artist_follows WHERE userId = ? AND artistId = ?',
      [userId, artistId]
    );
    return rows.length > 0;
  }

  // Lấy danh sách nghệ sĩ đang được theo dõi bởi user
  static async getFollowedArtistsByUser(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        a.id, 
        a.name, 
        a.avatar, 
        a.biography,
        af.followedAt,
        (SELECT COUNT(*) FROM artist_follows WHERE artistId = a.id) as followerCount
      FROM artist_follows af
      JOIN artists a ON af.artistId = a.id
      WHERE af.userId = ?
      ORDER BY af.followedAt DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.execute(query, [
      userId,
      limit.toString(),   // Chuyển limit sang string
      offset.toString()   // Chuyển offset sang string
    ]);
    return rows;
  }

  // Đếm số lượng follower của một nghệ sĩ
  static async getArtistFollowerCount(artistId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as followerCount FROM artist_follows WHERE artistId = ?',
      [artistId]
    );
    return rows[0].followerCount;
  }


  static async getTopFollowedArtists(page = 1, limit = 10) {
    // Ép kiểu chính xác và đảm bảo giá trị dương
    page = Math.max(1, parseInt(page, 10));
    limit = Math.max(1, parseInt(limit, 10));

    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        a.id, 
        a.name, 
        a.avatar, 
        a.biography,
        COUNT(af.artistId) as followerCount
      FROM artists a
      LEFT JOIN artist_follows af ON a.id = af.artistId
      GROUP BY a.id
      ORDER BY followerCount DESC
      LIMIT ? OFFSET ?
    `;

    try {
      const [rows] = await db.execute(query, [
        limit.toString(),
        offset.toString()
      ]);
      return rows;
    } catch (error) {
      console.error('Error in getTopFollowedArtists:', error);
      throw error;
    }
  }
  // Thống kê follow
  static async getFollowStatistics(userId) {
    const [totalFollowedArtists] = await db.execute(
      'SELECT COUNT(*) as count FROM artist_follows WHERE userId = ?',
      [userId]
    );

    const query = `
      SELECT 
        a.id, 
        a.name, 
        a.avatar,
        COUNT(af.userId) as followerCount
      FROM artists a
      LEFT JOIN artist_follows af ON a.id = af.artistId
      GROUP BY a.id
      ORDER BY followerCount DESC
      LIMIT 5
    `;

    const [topArtists] = await db.execute(query);

    return {
      totalFollowedArtists: totalFollowedArtists[0].count,
      topArtists
    };
  }
  // Lấy danh sách followers của một nghệ sĩ
  // Lấy danh sách followers của một nghệ sĩ với thông tin chi tiết nghệ sĩ
  static async getArtistFollowers(artistId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const query = `
    SELECT 
      u.id as userId, 
      u.username, 
      u.avatar as userAvatar,
      af.followedAt,
      a.id as artistId,
      a.name as artistName,
      a.avatar as artistAvatar,
      a.biography
    FROM artist_follows af
    JOIN users u ON af.userId = u.id
    JOIN artists a ON af.artistId = a.id
    WHERE af.artistId = ?
    ORDER BY af.followedAt DESC
    LIMIT ? OFFSET ?
  `;

    const [rows] = await db.execute(query, [artistId, limit.toString(), offset.toString()]);
    return rows;
  }
}

module.exports = FollowModel;