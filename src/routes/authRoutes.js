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

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         id:
 *           type: integer
 *           description: ID tự động tăng của người dùng
 *         email:
 *           type: string
 *           description: Email của người dùng
 *         password:
 *           type: string
 *           description: Mật khẩu của người dùng
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Đăng ký người dùng mới
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email của người dùng
 *               password:
 *                 type: string
 *                 description: Mật khẩu của người dùng
 *     responses:
 *       201:
 *         description: Người dùng được tạo thành công
 *       400:
 *         description: Thông tin không hợp lệ hoặc đã tồn tại
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Đăng nhập người dùng
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email của người dùng
 *               password:
 *                 type: string
 *                 description: Mật khẩu của người dùng
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *       400:
 *         description: Thông tin đăng nhập không hợp lệ
 */

/**
 * @swagger
 * /auth/{id}:
 *   get:
 *     summary: Lấy thông tin người dùng theo ID
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID của người dùng
 *     responses:
 *       200:
 *         description: Thông tin người dùng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Không tìm thấy người dùng
 */

/**
 * @swagger
 * /auth/{id}:
 *   put:
 *     summary: Cập nhật thông tin người dùng
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID của người dùng
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: username người dùng
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh đại diện của người dùng
 *               birthday:
 *                 type: string
 *                 format: date
 *                 description: Ngày sinh của người dùng
 *               password:
 *                 type: string
 *                 description: Mật khẩu của người dùng
 *     responses:
 *       200:
 *         description: Thông tin người dùng đã được cập nhật
 *       400:
 *         description: Thông tin không hợp lệ
 *       404:
 *         description: Không tìm thấy người dùng
 */

/**
 * @swagger
 * /auth/{id}:
 *   delete:
 *     summary: Xóa người dùng
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID của người dùng
 *     responses:
 *       200:
 *         description: Người dùng đã được xóa
 *       404:
 *         description: Không tìm thấy người dùng
 */

/**
 * @swagger
 * /auth:
 *   get:
 *     summary: Lấy danh sách tất cả người dùng
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Danh sách người dùng
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */

// HTTP routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post("/login/google", AuthController.googleLogin);
router.get('/:id', AuthController.getUser);
router.put('/:id', upload.single('avatar'), AuthController.updateUser);
router.delete('/:id', AuthController.deleteUser);
router.get('/', AuthController.getAllUsers);
router.post("/logout", AuthController.logout);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password/:token", AuthController.resetPassword);
router.post('/upload-avatar/:id', upload.single('avatar'), AuthController.uploadAvatar);

module.exports = router;
