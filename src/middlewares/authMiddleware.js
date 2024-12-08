const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const ArtistAuthModel = require('../models/artistAuthModel');

const authMiddleware = async (req, res, next) => {
    try {
        let token;

        // Log để debug
        console.log('Auth header:', req.headers.authorization);
        console.log('Cookies:', req.cookies);

        // Lấy token từ header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }

        // Lấy token từ cookie nếu không có trong header
        if (!token && req.cookies?.token?.accessToken) {
            token = req.cookies.token.accessToken;
        }

        console.log('Extracted token:', token ? 'exists' : 'not found');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided."
            });
        }

        // Xác thực token
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Token decoded successfully:', decoded);

            const user = await UserModel.getUserById(decoded.id);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "User not found or invalid token."
                });
            }

            req.user = {
                id: user.id,
                email: user.email,
                role: user.role
            };

            next();
        } catch (error) {
            console.error('Token verification error:', error);
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token.",
                error: error.message
            });
        }
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
            error: error.message
        });
    }
};

const verifyArtistToken = async (req, res, next) => {
  try {
    // Lấy token từ header hoặc cookie
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.artist_token) {
      const tokenData = decodeURIComponent(req.cookies.artist_token);
      const { accessToken } = JSON.parse(tokenData);
      token = accessToken;
    }

    if (!token) {
      return res.status(401).json({ message: 'Không tìm thấy token xác thực' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Kiểm tra xem nghệ sĩ có tồn tại không
    const artist = await ArtistAuthModel.getArtistById(decoded.artist_id);
    if (!artist) {
      return res.status(401).json({ message: 'Không tìm thấy nghệ sĩ' });
    }

    // Thêm thông tin nghệ sĩ vào request
    req.artist = {
      id: decoded.id,
      email: decoded.email,
      artist_id: decoded.artist_id,
      role: decoded.role
    };

    next();
  } catch (error) {
    console.error('Lỗi xác thực:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token đã hết hạn' });
    }
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Helper function để trích xuất token từ header hoặc cookie
const extractToken = (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    const cookieToken = req.cookies?.token?.accessToken;
    return cookieToken || null;
};

module.exports = {
    authMiddleware,
    verifyArtistToken
};
