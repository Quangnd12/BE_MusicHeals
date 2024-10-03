const UserModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/sendEmail'); // Import hàm gửi email
const isCompanyEmail = require('../utils/isCompanyEmail');
const generateToken = require('../utils/generateToken');
const { admin, db } = require('../config/firebase');

// Đăng ký người dùng
const register = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) 
      return res.status(400).json({ message: 'Email and password are required' });

    const role = isCompanyEmail(email) ? 'admin' : 'user';
    const existingUser = await UserModel.getUserByEmail(email);
    if (existingUser) 
      return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await UserModel.createUser(email, hashedPassword, role);

    const { accessToken, refreshToken } = generateToken(newUser);
    
    res.cookie('token', accessToken, { httpOnly: true });
    res.cookie('refreshToken', refreshToken, { httpOnly: true });

    res.status(201).json({ 
      message: 'User registered successfully', 
      user: newUser,
      token: accessToken  
    });
  } catch (error) {
    console.error('Register Error:', error.message, error.stack);
    res.status(500).json({ message: 'Server error' });
  }
};

// Đăng nhập người dùng
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.getUserByEmail(email);
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const { accessToken, refreshToken } = generateToken(user);
    res.cookie('token', accessToken, { httpOnly: true });
    res.cookie('refreshToken', refreshToken, { httpOnly: true });
    res.json({ message: 'Login successful', user });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Đăng xuất người dùng
const logout = (req, res) => {
  res.clearCookie('token');
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
};

// Quên mật khẩu
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await UserModel.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'User with that email does not exist' });
    }

    const resetToken = await UserModel.createPasswordResetToken(email);
    const resetURL = `http://localhost:3000/reset-password/${resetToken}`;

    const message = `Quên mật khẩu? Vui lòng nhấp vào đường link sau để đặt lại mật khẩu của bạn: ${resetURL}.\nNếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.`;

    await sendEmail({
      email: email,
      subject: 'Đặt lại mật khẩu của bạn (có hiệu lực trong 10 phút)',
      message
    });

    res.status(200).json({
      status: 'success',
      message: 'Token đã được gửi đến email của bạn!'
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ message: 'Có lỗi xảy ra khi gửi email đặt lại mật khẩu' });
  }
};

// Đặt lại mật khẩu
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await UserModel.resetPassword(token, password);

    const { accessToken, refreshToken } = generateToken(user);
    res.cookie('token', accessToken, { httpOnly: true });
    res.cookie('refreshToken', refreshToken, { httpOnly: true });

    res.status(200).json({
      status: 'success',
      message: 'Mật khẩu đã được đặt lại thành công'
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

// Hàm xử lý đăng nhập bằng Google
const googleSignIn = async (req, res) => {
  const { idToken } = req.body;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name, picture } = decodedToken;

    const role = isCompanyEmail(email) ? 'admin' : 'user';

    const userRef = db.collection('users').where('email', '==', email);
    const userSnapshot = await userRef.get();

    let user;

    if (userSnapshot.empty) {
      const newUserRef = db.collection('users').doc();
      user = {
        id: newUserRef.id,
        email,
        username: name || null,
        avatar: picture || null,
        role,
        playlistsId: null,
        favoritesId: null,
        followsId: null,
        waitinglistId: null,
        listeninghistoryId: null,
        reportsId: null,
        recommendations: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        // ... other user fields
      };
      await newUserRef.set(user);
    } else {
      user = userSnapshot.docs[0].data();
    }

    const { accessToken, refreshToken } = generateToken(user);

    // Lưu refresh token vào database
    await db.collection('refreshTokens').doc(user.id).set({
      token: refreshToken,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      message: 'Đăng nhập thành công',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
      },
      accessToken,
    });
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    res.status(400).json({ error: 'Xác thực thất bại', details: error.message });
  }
};

const refreshToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token không tồn tại' });
  }

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

    const { accessToken, refreshToken: newRefreshToken } = generateToken(user);

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

    res.json({ accessToken });
  } catch (error) {
    console.error('Refresh Token Error:', error);
    res.status(401).json({ message: 'Refresh token không hợp lệ hoặc hết hạn' });
  }
};


module.exports = { register, login, logout, forgotPassword, resetPassword, googleSignIn,refreshToken  };
