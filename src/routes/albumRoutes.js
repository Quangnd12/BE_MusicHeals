const express = require("express");
const router = express.Router();
const albumController = require("../controllers/albumController");

const multer = require("multer");

// Thiết lập multer để upload file ảnh
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * @swagger
 * components:
 *   schemas:
 *     Album:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         artistId:
 *           type: array
 *           items:
 *             type: string
 *           description: Danh sách ID của  các nghệ sĩ
 *         songId:
 *           type: array
 *           items:
 *             type: string
 *           description: Danh sách ID của  các bài hát
 *         describe:
 *           type: string
 *         totalTracks:
 *           type: integer
 *         popularity:
 *           type: integer
 *         releaseDate:
 *           type: string
 *           format: date
 *         image:
 *           type: string
 *           format: binary
 *
 * /albums:
 *   get:
 *     summary: Lấy danh sách tất cả album
 *     description: API này dùng để lấy danh sách tất cả album, có thể tìm kiếm và phân trang.
 *     tags: [Albums]
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
 *         description: Số lượng album trả về trên mỗi trang (mặc định là 5)
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         required: false
 *         description: Tìm kiếm album theo tên
 *     responses:
 *       200:
 *         description: Danh sách album được trả về thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Tổng số album
 *                 currentPage:
 *                   type: integer
 *                   description: Trang hiện tại
 *                 totalPages:
 *                   type: integer
 *                   description: Tổng số trang
 *                 albums:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Album'
 *       500:
 *         description: Có lỗi xảy ra trong quá trình lấy dữ liệu
 *
 *   post:
 *     summary: Tạo mới album
 *     tags: [Albums]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               artistId:
 *                 type: array
 *                 items:
 *                   type: string
 *               songId:
 *                 type: array
 *                 items:
 *                   type: string
 *               describe:
 *                 type: string
 *               totalTracks:
 *                 type: integer
 *               popularity:
 *                 type: integer
 *               releaseDate:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Tạo album thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *
 * /albums/{albumId}:
 *   get:
 *     summary: Lấy thông tin album theo ID
 *     tags: [Albums]
 *     parameters:
 *       - name: albumId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lấy thông tin album thành công
 *
 *   put:
 *     summary: Cập nhật album
 *     tags: [Albums]
 *     parameters:
 *       - name: albumId
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
 *               title:
 *                 type: string
 *               artistId:
 *                 type: array
 *                 items: 
 *                   type: string  
 *               songId:
 *                 type: array
 *                 items:
 *                   type: string
 *               describe:
 *                 type: string
 *               totalTracks:
 *                 type: integer
 *               popularity:
 *                 type: integer
 *               releaseDate:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Cập nhật album thành công
 *
 *   delete:
 *     summary: Xóa album
 *     tags: [Albums]
 *     parameters:
 *       - name: albumId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa album thành công
 */

// Tạo mới album và upload ảnh bìa
router.post("/albums", upload.single("image"), albumController.createAlbum);

// Lấy thông tin album theo ID
router.get("/albums/:albumId", albumController.getAlbumById);

// Cập nhật thông tin album và upload ảnh bìa mới
router.put(
  "/albums/:albumId",
  upload.single("image"),
  albumController.updateAlbum
);

// Xóa album
router.delete("/albums/:albumId", albumController.deleteAlbum);

// Lấy danh sách tất cả album
router.get("/albums", albumController.getAllAlbums);

module.exports = router;
