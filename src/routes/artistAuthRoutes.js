const express = require('express');
const ArtistAuthController = require('../controllers/artistAuthController');
const  artistAuthMiddleware  = require('../middlewares/artistAuthMiddleware'); // Import middleware
const multer = require('multer');

// Cấu hình Multer
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  },
});

const router = express.Router();

// Không yêu cầu xác thực
router.post('/register', upload.single('avatar'), ArtistAuthController.register);
router.post('/login', ArtistAuthController.login);
router.post('/forgot-password', ArtistAuthController.forgotPassword);
router.post('/reset-password', ArtistAuthController.resetPassword);
router.post('/logout', ArtistAuthController.logout);
router.get("/validate-token", ArtistAuthController.validateToken);
// Routes cho Google OAuth
router.post('/register-google', ArtistAuthController.googleRegister);
router.post('/login-google', ArtistAuthController.googleLogin);

// Yêu cầu xác thực qua artistAuthMiddleware
router.use(artistAuthMiddleware); // Đặt middleware tại đây

// Các route yêu cầu token hợp lệ
router.put('/profile', upload.single('avatar'), ArtistAuthController.updateProfile);


module.exports = router;
