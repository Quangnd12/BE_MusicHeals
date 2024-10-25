const express = require("express");
const router = express.Router();
const artistController = require("../controllers/artistController");

const multer = require("multer");

// Thiết lập multer để upload file ảnh
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * @swagger
 * components:
 *   schemas:
 *     Artist:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         bio:
 *           type: string
 *         avatar:
 *           type: string
 *         albumId:
 *           type: array
 *           items:
 *             type: string
 *         songId:
 *           type: array
 *           items:
 *             type: string
 *         followerId:
 *           type: array
 *           items:
 *             type: string
 *         monthly_listeners:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         albums:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Album'
 *         songs:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Song'
 *         followers:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Follow'
 * 
 *     Album:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         image:
 *           type: string
 *         releaseDate:
 *           type: string
 *           format: date-time
 *         totalTracks:
 *           type: integer
 *         popularity:
 *           type: integer
 *         artistId:
 *           type: array
 *           items:
 *             type: string
 *         songId:
 *           type: array
 *           items:
 *             type: string
 *         describe:
 *           type: string
 * 
 *     Song:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         artistIds:
 *           type: array
 *           items:
 *             type: string
 *         albumIds:
 *           type: array
 *           items:
 *             type: string
 *         genreIds:
 *           type: array
 *           items:
 *             type: string
 *         playcountId:
 *           type: integer
 *         lyrics:
 *           type: string
 *         duration:
 *           type: integer
 *         releasedate:
 *           type: string
 *           format: date
 *         is_explicit:
 *           type: boolean
 *         file_song:
 *           type: string
 *         image:
 *           type: string
 * 
 *     Follow:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         artistId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 * /artists:
 *   get:
 *     summary: Lấy danh sách tất cả nghệ sĩ
 *     description: API này dùng để lấy danh sách tất cả nghệ sĩ, có thể tìm kiếm và phân trang.
 *     tags: [Artists]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         required: false
 *         description: Trang hiện tại (mặc định là 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *         description: Số lượng nghệ sĩ trả về trên mỗi trang (mặc định là 5)
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         required: false
 *         description: Tìm kiếm nghệ sĩ theo tên
 *     responses:
 *       200:
 *         description: Danh sách nghệ sĩ được trả về thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Tổng số nghệ sĩ
 *                 currentPage:
 *                   type: integer
 *                   description: Trang hiện tại
 *                 totalPages:
 *                   type: integer
 *                   description: Tổng số trang
 *                 artists:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Artist'
 *       500:
 *         description: Có lỗi xảy ra trong quá trình lấy dữ liệu
 *
 *   post:
 *     summary: Tạo mới nghệ sĩ
 *     tags: [Artists]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               bio:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *               albumId:
 *                 type: array
 *                 items:
 *                   type: string
 *               songId:
 *                 type: array
 *                 items:
 *                   type: string
 *               followerId:
 *                 type: array
 *                 items:
 *                   type: string
 *               monthly_listeners:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Tạo thành công
 *       500:
 *         description: Có lỗi xảy ra trong quá trình tạo mới nghệ sĩ
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Artist'
 *       404:
 *         description: Không tìm thấy nghệ sĩ
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               bio:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *               albumId:
 *                 type: array
 *                 items:
 *                   type: string
 *               songId:
 *                 type: array
 *                 items:
 *                   type: string
 *               followerId:
 *                 type: array
 *                 items:
 *                   type: string
 *               monthly_listeners:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy nghệ sĩ
 *       500:
 *         description: Có lỗi xảy ra trong quá trình cập nhật
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
 *       404:
 *         description: Không tìm thấy nghệ sĩ
 */

// Tạo mới nghệ sĩ và upload avatar
router.post("/artists", upload.single('avatar'), artistController.createArtist);

// Lấy thông tin nghệ sĩ theo ID
router.get("/artists/:artistId", artistController.getArtistById);

// Cập nhật thông tin nghệ sĩ và upload avatar mới
router.put("/artists/:artistId", upload.single('avatar'), artistController.updateArtist);

// Xóa nghệ sĩ
router.delete("/artists/:artistId", artistController.deleteArtist);

// Lấy danh sách tất cả nghệ sĩ
router.get("/artists", artistController.getAllArtists);

module.exports = router;
