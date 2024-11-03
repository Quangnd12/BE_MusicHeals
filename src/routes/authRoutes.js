const express = require('express');
const AuthController = require('../controllers/authController');
const router = express.Router();
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Giới hạn 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});


// HTTP routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post("/login/google", AuthController.googleLogin);
router.post('/register/google', AuthController.createUserWithGoogle);
router.get('/:id', AuthController.getUser);
router.put('/:id', upload.single('avatar'), AuthController.updateUser);
router.delete('/:id', AuthController.deleteUser);
router.get('/', AuthController.getAllUsers);
router.post("/logout", AuthController.logout);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password/:token", AuthController.resetPassword);
router.post('/upload-avatar/:id', upload.single('avatar'), AuthController.uploadAvatar);

module.exports = router;
