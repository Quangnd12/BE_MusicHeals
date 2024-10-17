const express = require("express");
const router = express.Router();
const artistController = require("../controllers/artistController");

/**
 * @swagger
 * components:
 *   schemas:
 *     Artist:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         bio:
 *           type: string
 *         genre:
 *           type: array
 *           items:
 *             type: string
 *         albums:
 *           type: array
 *           items:
 *             type: string
 *         songs:
 *           type: array
 *           items:
 *             type: string
 *         followers:
 *           type: array
 *           items:
 *             type: string
 *         monthly_listeners:
 *           type: integer
 *
 * /artists:
 *   get:
 *     summary: Lấy tất cả nghệ sĩ
 *     tags: [Artists]
 *     responses:
 *       200:
 *         description: Thành công
 *
 *   post:
 *     summary: Tạo mới nghệ sĩ
 *     tags: [Artists]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Artist'
 *     responses:
 *       201:
 *         description: Tạo thành công
 *
 * /artists/{artistId}:
 *   get:
 *     summary: Lấy thông tin nghệ sĩ theo ID
 *     tags: [Artists]
 *     parameters:
 *       - name: artistId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thành công
 *
 *   put:
 *     summary: Cập nhật nghệ sĩ
 *     tags: [Artists]
 *     parameters:
 *       - name: artistId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Artist'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *
 *   delete:
 *     summary: Xóa nghệ sĩ
 *     tags: [Artists]
 *     parameters:
 *       - name: artistId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
// Tạo mới nghệ sĩ
router.post("/artists", artistController.createArtist);

// Lấy thông tin nghệ sĩ theo ID
router.get("/artists/:artistId", artistController.getArtistById);

// Cập nhật thông tin nghệ sĩ
router.put("/artists/:artistId", artistController.updateArtist);

// Xóa nghệ sĩ
router.delete("/artists/:artistId", artistController.deleteArtist);

// Lấy danh sách tất cả nghệ sĩ
router.get("/artists/", artistController.getAllArtists);

module.exports = router;
