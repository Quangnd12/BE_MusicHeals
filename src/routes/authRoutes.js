const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const rateLimit = require("express-rate-limit");
const { check, validationResult } = require("express-validator");

// Thiết lập rate limiter cho route login
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5, // Giới hạn 5 yêu cầu mỗi 15 phút
  message: "Quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút.",
});

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Các API liên quan đến xác thực và đăng nhập
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
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 example: "123456"
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 example: "user"
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Người dùng đã tồn tại hoặc yêu cầu không hợp lệ
 *       500:
 *         description: Lỗi server
 */
// Đăng ký người dùng với kiểm tra dữ liệu đầu vào
router.post(
  "/register",
  [
    check("email").isEmail().withMessage("Email không hợp lệ."),
    check("password")
      .isLength({ min: 8 })
      .withMessage("Mật khẩu phải có ít nhất 8 ký tự."),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(errors.array()); // Thêm log để kiểm tra lỗi từ validator
      return res.status(400).json({ errors: errors.array() });
    }
    await authController.register(req, res, next);
  }
);

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
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Thông tin đăng nhập không hợp lệ
 *       500:
 *         description: Lỗi server
 */
// Đăng nhập người dùng với rate limit và kiểm tra dữ liệu đầu vào
router.post(
  "/login",
  loginRateLimiter,
  [
    check("email").isEmail().withMessage("Email không hợp lệ."),
    check("password").exists().withMessage("Mật khẩu không được để trống."),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    await authController.login(req, res, next);
  }
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Đăng xuất người dùng
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Đăng xuất thành công"
 *       401:
 *         description: Người dùng chưa đăng nhập
 *       500:
 *         description: Lỗi server
 */
// Đăng xuất người dùng
router.post("/logout", authController.logout);

/**
 * @swagger
 * /auth/admin:
 *   get:
 *     summary: Truy cập trang quản trị (chỉ dành cho Admin)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Truy cập thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Welcome Admin!"
 *       403:
 *         description: Không có quyền truy cập
 *       401:
 *         description: Người dùng chưa đăng nhập
 */
// Route chỉ dành cho Admin
router.get("/admin", authMiddleware, roleMiddleware(["admin"]), (req, res) => {
  res.json({ message: "Welcome Admin!" });
});

/**
 * @swagger
 * /auth/dashboard:
 *   get:
 *     summary: Truy cập trang tổng quan người dùng (user và admin)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Truy cập thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Welcome user/admin"
 *       401:
 *         description: Người dùng chưa đăng nhập
 */
// Route dành cho cả user và admin
router.get("/dashboard", authMiddleware, (req, res) => {
  res.json({ message: `Welcome ${req.user.role}` });
});

/**
 * @swagger
 * /users/{userId}:
 *   get:
 *     summary: Lấy thông tin người dùng theo ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID của người dùng
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Không tìm thấy người dùng
 *       500:
 *         description: Lỗi server
 */
// Lấy thông tin người dùng theo ID
router.get("/users/:userId", userController.getUserById);

router.post('/googleSignIn', authController.googleSignIn);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Làm mới access token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Access token mới
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Refresh token không hợp lệ hoặc hết hạn
 */
router.post("/refresh-token", authController.refreshToken);

/**
 * @swagger
 * /auth/forgotPassword:
 *   post:
 *     summary: Yêu cầu liên kết đặt lại mật khẩu
 *     description: Gửi liên kết đặt lại mật khẩu đến email của người dùng.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The email address of the user requesting the password reset.
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset link sent successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password reset link sent to your email.
 *       400:
 *         description: Bad request (invalid email or user not found).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No user found with that email address.
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: An error occurred while sending the password reset link.
 */

router.post("/forgotPassword", authController.forgotPassword);

/**
 * @swagger
 * /auth/resetPassword/{token}:
 *   patch:
 *     summary: Đặt lại mật khẩu của người dùng
 *     description: Đặt lại mật khẩu của người dùng bằng mã thông báo được gửi đến email của họ.
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         description: The password reset token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - confirmPassword
 *             properties:
 *               password:
 *                 type: string
 *                 description: The new password for the user.
 *                 example: newpassword123
 *               confirmPassword:
 *                 type: string
 *                 description: Must match the new password.
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Password reset successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password reset successful.
 *       400:
 *         description: Bad request (invalid token or password mismatch).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Token is invalid or passwords do not match.
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: An error occurred while resetting the password.
 */
router.patch("/resetPassword/:token", authController.resetPassword);

module.exports = router;
