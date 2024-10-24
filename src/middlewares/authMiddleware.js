const jwt = require('jsonwebtoken');
const admin = require('firebase-admin'); // giả sử bạn dùng Firebase
const { generateToken } = require('../utils/generateToken'); // hàm tạo token
const db = admin.firestore();

const authMiddleware = async (req, res, next) => {
  const accessToken = req.headers.authorization?.split(' ')[1];
  const refreshToken = req.cookies.refreshToken;

  if (!accessToken) {
    return res.status(401).json({ message: 'Access token không tồn tại' });
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError' && refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Kiểm tra refresh token trong database
        const tokenDoc = await db.collection('refreshTokens').doc(decoded.id).get();
        if (!tokenDoc.exists || tokenDoc.data().token !== refreshToken) {
          return res.status(401).json({ message: 'Refresh token không hợp lệ' });
        }

        const userRef = db.collection('users').doc(decoded.id);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          return res.status(401).json({ message: 'Người dùng không tồn tại' });
        }

        const user = userDoc.data();

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateToken(user);

        // Cập nhật refresh token mới trong database
        await db.collection('refreshTokens').doc(user.id).set({
          token: newRefreshToken,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.cookie('refreshToken', newRefreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        req.user = user;
        req.headers.authorization = `Bearer ${newAccessToken}`;
        next();
      } catch (refreshError) {
        return res.status(401).json({ message: 'Refresh token không hợp lệ hoặc hết hạn' });
      }
    } else {
      return res.status(401).json({ message: 'Access token không hợp lệ' });
    }
  }
};

module.exports = authMiddleware;
