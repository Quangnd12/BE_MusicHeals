const jwt = require("jsonwebtoken");
const generateToken = require("../utils/generateToken"); // Đường dẫn tới hàm tạo token của bạn
const User = require("../models/userModel"); // Đường dẫn tới model người dùng (ví dụ dùng Sequelize)

const authenticateUser = async (req, res, next) => {
  try {
    // Lấy token từ header
    const accessToken = req.headers.authorization?.split(" ")[1];
    const refreshToken = req.headers["x-refresh-token"];

    if (!accessToken) {
      return res.status(401).json({ message: "Access token not provided." });
    }

    try {
      // Xác thực accessToken
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      req.user = decoded; // Lưu thông tin người dùng vào request
      next(); // Tiếp tục xử lý yêu cầu
    } catch (error) {
      if (error.name === "TokenExpiredError" && refreshToken) {
        try {
          // Xác thực refreshToken
          const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
          
          // Tìm người dùng từ database bằng ID từ refreshToken
          const user = await User.findByPk(decodedRefresh.id);

          if (!user) {
            return res.status(403).json({ message: "User not found." });
          }

          // Tạo accessToken và refreshToken mới
          const tokens = generateToken(user);
          req.user = { id: user.id, role: user.role }; // Cập nhật thông tin người dùng cho request

          // Gửi lại các token mới trong header để client lưu lại
          res.setHeader("Authorization", `Bearer ${tokens.accessToken}`);
          res.setHeader("x-refresh-token", tokens.refreshToken);

          next(); // Tiếp tục xử lý yêu cầu
        } catch (refreshError) {
          return res.status(403).json({ message: "Invalid or expired refresh token." });
        }
      } else {
        return res.status(403).json({ message: "Invalid or expired access token." });
      }
    }
  } catch (error) {
    return res.status(500).json({ message: "Authentication error." });
  }
};

// Middleware kiểm tra quyền admin
const isAdmin = (req, res, next) => {
  if (req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Bạn không có quyền admin." });
};

// Middleware kiểm tra quyền artist
const isArtist = (req, res, next) => {
  if (req.user.role === "artist" || req.user.role === "admin") {
    return next(); // Cho phép artist và admin tiếp tục
  }
  return res.status(403).json({ message: "Bạn không có quyền truy cập này." });
};

// Middleware kiểm tra quyền user
const isUser = (req, res, next) => {
  if (req.user.role === "user" || req.user.role === "artist" || req.user.role === "admin") {
    return next(); // Cho phép mọi loại role tiếp tục
  }
  return res.status(403).json({ message: "Bạn không có quyền truy cập này." });
};

module.exports = { authenticateUser, isAdmin, isArtist, isUser };
