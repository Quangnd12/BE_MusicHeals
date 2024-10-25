const followModel = require('../models/followModel');

// Tạo mới một follow
exports.createFollow = async (req, res) => {
  try {
    const { userId, artistId } = req.body;
    const followData = {
      userId,
      artistId,
    };

    const followId = await followModel.createFollow(followData); // Gọi từ model
    res.status(201).json({ message: 'Follow created successfully', followId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy tất cả các follow
exports.getAllFollows = async (req, res) => {
  try {
    const follows = await followModel.getAllFollows(); // Gọi từ model
    res.status(200).json(follows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy thông tin follow theo ID
exports.getFollowById = async (req, res) => {
  try {
    const followId = req.params.followId;
    const follow = await followModel.getFollowById(followId); // Gọi từ model

    if (!follow) {
      return res.status(404).json({ message: 'Follow not found' });
    }

    res.status(200).json(follow);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Xóa follow
exports.deleteFollow = async (req, res) => {
  try {
    const followId = req.params.followId;
    const follow = await followModel.deleteFollow(followId); // Gọi từ model

    if (!follow) {
      return res.status(404).json({ message: 'Follow not found' });
    }

    res.status(200).json({ message: 'Follow deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
