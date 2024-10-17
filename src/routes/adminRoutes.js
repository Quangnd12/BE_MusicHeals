const express = require('express');
const { getAllUsers } = require('../controllers/adminController');
const router = express.Router();

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Lấy danh sách tất cả người dùng
 *     description: API này dùng để lấy danh sách tất cả người dùng, có thể giới hạn số lượng người dùng được trả về bằng cách truyền tham số limit.
 *     tags: [Quản trị viên]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *         description: Giới hạn số lượng người dùng được trả về (mặc định là 10)
 *       - in: query
 *         name: startAfter
 *         schema:
 *           type: string
 *         required: false
 *         description: ID của người dùng bắt đầu sau đó
 *     responses:
 *       200:
 *         description: Danh sách người dùng được trả về thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: ID của người dùng
 *                       username:
 *                         type: string
 *                         description: Tên người dùng
 *       500:
 *         description: Có lỗi xảy ra trong quá trình lấy dữ liệu
 */
router.get('/admin/users', getAllUsers);

module.exports = router;
