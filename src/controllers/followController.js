const FollowModel = require('../models/followModel');
const ArtistModel = require('../models/artistModel');

class FollowController {

  async toggleFollowArtist(req, res) {
    try {
      const { artistId } = req.params;
      const userId = req.user.id;
  
      // Kiểm tra nghệ sĩ tồn tại
      const artist = await ArtistModel.getArtistById(artistId);
      if (!artist) {
        return res.status(404).json({ 
          success: false, 
          message: 'Nghệ sĩ không tồn tại' 
        });
      }
  
      // Kiểm tra trạng thái follow hiện tại
      const isFollowing = await FollowModel.isFollowing(userId, artistId);
  
      if (isFollowing) {
        // Nếu đang follow thì hủy follow
        await FollowModel.unfollowArtist(userId, artistId);
      } else {
        // Nếu chưa follow thì follow
        await FollowModel.followArtist(userId, artistId);
      }
  
      // Lấy số lượng follower mới
      const followerCount = await FollowModel.getArtistFollowerCount(artistId);
  
      res.status(200).json({ 
        success: true, 
        message: isFollowing ? 'Đã hủy theo dõi nghệ sĩ' : 'Đã theo dõi nghệ sĩ thành công',
        data: {
          artistId,
          isFollowing: !isFollowing,
          followerCount
        }
      });
    } catch (error) {
      console.error('Lỗi toggle follow:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  
  // Lấy danh sách nghệ sĩ đang follow
  async getFollowedArtists(req, res) {
    try {
      const userId = req.user.id;
      // Kiểm tra và ép kiểu an toàn
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
  
      const followedArtists = await FollowModel.getFollowedArtistsByUser(
        userId, 
        page, 
        limit
      );
  
      // Lấy tổng số nghệ sĩ được follow
      const [totalResult] = await db.execute(
        'SELECT COUNT(*) as total FROM artist_follows WHERE userId = ?', 
        [userId]
      );
      const total = totalResult[0].total;
  
      res.status(200).json({ 
        success: true, 
        data: {
          artists: followedArtists,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Lỗi lấy danh sách nghệ sĩ theo dõi:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }
  // Lấy danh sách follower của nghệ sĩ
  // Lấy danh sách follower của nghệ sĩ
  async getArtistFollowers(req, res) {
    try {
      const { artistId } = req.params;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 10);

      // Kiểm tra nghệ sĩ tồn tại
      const artist = await ArtistModel.getArtistById(artistId);
      if (!artist) {
        return res.status(404).json({ 
          success: false, 
          message: 'Nghệ sĩ không tồn tại' 
        });
      }

      const followers = await FollowModel.getArtistFollowers(
        artistId, 
        page, 
        limit
      );

      const totalFollowers = await FollowModel.getArtistFollowerCount(artistId);

      res.status(200).json({ 
        success: true, 
        data: {
          followers,
          totalFollowers
        }
      });
    } catch (error) {
      console.error('Lỗi lấy danh sách follower:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }
  async getTopFollowedArtists(req, res) {
    try {
      // Kiểm tra và ép kiểu an toàn
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
  
      const topArtists = await FollowModel.getTopFollowedArtists(page, limit);
  
      res.status(200).json({ 
        success: true, 
        data: {
          artists: topArtists,
          page,
          limit
        }
      });
    } catch (error) {
      console.error('Lỗi lấy danh sách nghệ sĩ có nhiều follow:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }
  // Lấy thống kê follow
  async getFollowStatistics(req, res) {
    try {
      const userId = req.user.id;

      const statistics = await FollowModel.getFollowStatistics(userId);

      res.status(200).json({ 
        success: true, 
        data: statistics 
      });
    } catch (error) {
      console.error('Lỗi lấy thống kê follow:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }
}

module.exports = new FollowController();