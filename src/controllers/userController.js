const UserModel = require('../models/userModel');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Lấy thông tin người dùng theo ID
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params; // Lấy userId từ URL params
    const user = await UserModel.getUserById(userId); // Gọi hàm getUserById từ UserModel

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cập nhật thông tin hồ sơ người dùng
const updateProfile = async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user.id;

    // Kiểm tra xem người dùng có quyền cập nhật không
    if (userId !== req.params.userId) {
      return res.status(403).json({ message: 'Unauthorized to update this profile' });
    }

    // Cập nhật thông tin người dùng
    const updatedUser = await UserModel.updateProfile(userId, { username });
    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Upload ảnh đại diện người dùng
const uploadAvatar = async (req, res) => {
  upload.single('avatar')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: 'Avatar upload failed', error: err.message });
    }
    try {
      const userId = req.user.id;
      const file = req.file;

      // Kiểm tra file tải lên
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Gọi hàm uploadAvatar từ UserModel để xử lý ảnh đại diện
      const avatarUrl = await UserModel.uploadAvatar(userId, file.buffer, file.mimetype);
      res.json({ message: 'Avatar uploaded successfully', avatarUrl });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};

module.exports = { updateProfile, uploadAvatar, getUserById };
