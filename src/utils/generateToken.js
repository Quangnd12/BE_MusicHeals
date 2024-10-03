const jwt = require('jsonwebtoken');

// Hàm tạo token JWT
const generateToken = (user) => {
  // Payload chỉ chứa các thông tin cần thiết
  const payload = {
    id: user.id,
    role: user.role,
  };

  // Tạo token với thời gian sống là 1 giờ
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });

  // Tạo refresh token với thời gian sống dài hơn, ví dụ 7 ngày
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });

  return { accessToken, refreshToken };
};

module.exports = generateToken;
