const jwt = require("jsonwebtoken");
const ArtistAuthModel = require("../models/artistAuthModel");

const artistAuthMiddleware = async (req, res, next) => {
  try {
    let token = null;

    // Lấy token từ cookie hoặc header
    if (req.cookies && req.cookies.artist_token) {
      try {
        const parsedToken = JSON.parse(decodeURIComponent(req.cookies.artist_token));
        token = parsedToken.accessToken;
      } catch (error) {
        console.error("Lỗi parse artist_token:", error.message);
        return res.status(401).json({
          success: false,
          message: "Token không hợp lệ"
        });
      }
    } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Không tìm thấy token"
      });
    }

    // Xác thực token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Kiểm tra thông tin trong decoded token
    if (!decoded || !decoded.id || !decoded.email || !decoded.artist_id) {
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ hoặc thiếu thông tin"
      });
    }

    // Lấy thông tin nghệ sĩ từ database
    const artist = await ArtistAuthModel.getArtistByEmail(decoded.email);
    if (!artist) {
      return res.status(401).json({
        success: false,
        message: "Không tìm thấy nghệ sĩ"
      });
    }

    // Gán thông tin nghệ sĩ vào req
    req.artist = {
      id: artist.id,
      email: artist.email,
      artist_id: artist.artist_id,
      stage_name: artist.stage_name
    };

    next();
  } catch (error) {
    console.error("Middleware Error:", error);
    return res.status(401).json({
      success: false,
      message: "Token không hợp lệ",
      error: error.message
    });
  }
};

module.exports = artistAuthMiddleware;
