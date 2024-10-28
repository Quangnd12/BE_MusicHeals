const jwt = require('jsonwebtoken');
const generateToken = require('../utils/generateToken'); // Đường dẫn tới hàm tạo token của bạn
const User = require('../models/userModel'); // Đường dẫn tới model người dùng (nếu bạn dùng ORM cho MySQL, ví dụ Sequelize)

const authMiddleware = async (req, res, next) => {
  try {
    // Lấy token từ header
    const accessToken = req.headers.authorization?.split(' ')[1];
    const refreshToken = req.headers['x-refresh-token'];

    if (!accessToken) {
      return res.status(401).json({ message: 'Access token not provided.' });
    }

    try {
      // Xác thực accessToken
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      req.user = decoded; // Lưu thông tin người dùng vào request
      next(); // Tiếp tục xử lý yêu cầu
    } catch (error) {
      if (error.name === 'TokenExpiredError' && refreshToken) {
        // Xử lý khi accessToken hết hạn nhưng có refreshToken
        try {
          // Xác thực refreshToken
          const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
          
          // Tìm người dùng từ database bằng ID từ refreshToken
          const user = await User.findByPk(decodedRefresh.id); // Đối với Sequelize; nếu dùng ORM khác, tùy chỉnh hàm tìm kiếm

          if (!user) {
            return res.status(403).json({ message: 'User not found.' });
          }

          // Tạo accessToken và refreshToken mới
          const tokens = generateToken(user);
          req.user = { id: user.id, role: user.role }; // Cập nhật thông tin người dùng cho request

          // Gửi lại các token mới trong header để client lưu lại
          res.setHeader('Authorization', `Bearer ${tokens.accessToken}`);
          res.setHeader('x-refresh-token', tokens.refreshToken);

          next(); // Tiếp tục xử lý yêu cầu
        } catch (refreshError) {
          return res.status(403).json({ message: 'Invalid or expired refresh token.' });
        }
      } else {
        return res.status(403).json({ message: 'Invalid or expired access token.' });
      }
    }
  } catch (error) {
    return res.status(500).json({ message: 'Authentication error.' });
  }
};

module.exports = authMiddleware;
