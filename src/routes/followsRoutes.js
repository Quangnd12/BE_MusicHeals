// src/routes/followsRoutes.js
const express = require('express');
const router = express.Router();
const followController = require('../controllers/followController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Follow:
 *       type: object
 *       properties:
 *         followId:
 *           type: string
 *         userId:
 *           type: string
 *           description: ID của người dùng
 *         artistId:
 *           type: string
 *           description: ID của nghệ sĩ
 *         followed_at:
 *           type: string
 *           format: date-time
 *           description: Ngày theo dõi
 * 
 * /follows:
 *   get:
 *     summary: Lấy tất cả các follow
 *     tags: [Follows]
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Follow'
 * 
 *   post:
 *     summary: Tạo follow mới
 *     tags: [Follows]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Follow'
 *     responses:
 *       201:
 *         description: Tạo thành công
 * 
 * /follows/{followId}:
 *   get:
 *     summary: Lấy thông tin follow theo ID
 *     tags: [Follows]
 *     parameters:
 *       - name: followId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thành công
 * 
 *   delete:
 *     summary: Xóa follow theo ID
 *     tags: [Follows]
 *     parameters:
 *       - name: followId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 */

// Routes cho bảng Follows
router.get('/follows', followController.getAllFollows);
router.post('/follows', followController.createFollow);
router.get('/follows/:followId', followController.getFollowById);
router.delete('/follows/:followId', followController.deleteFollow);

module.exports = router;
