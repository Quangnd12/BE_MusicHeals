const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');

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
    authMiddleware
};
