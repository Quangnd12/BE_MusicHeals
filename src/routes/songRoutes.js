const express = require("express");
const songRoutes = require("../controllers/songController");
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const uploadSong = upload.fields([{ name: 'file_song', maxCount: 1 }, { name: 'image', maxCount: 1 }]); // Upload cả hình ảnh và âm thanh

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Songs
 *   description: API for managing songs
 */

/**
 * @swagger
 * /songs:
 *   post:
 *     summary: Create a new song
 *     tags: [Songs]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               lyrics:
 *                 type: string
 *               duration:
 *                 type: number
 *               releasedate:
 *                 type: string
 *                 format: date
 *               is_explicit:
 *                 type: boolean
 *               file_song:
 *                 type: string
 *                 format: binary  # Đây là file âm thanh
 *               image:
 *                 type: string
 *                 format: binary  # Đây là file hình ảnh
 *               artistIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               albumIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               genreIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Song created successfully
 *       400:
 *         description: Bad request (e.g. missing fields)
 *       500:
 *         description: Internal server error
 */
router.post("/", uploadSong, songRoutes.createSong);  // Xử lý upload hình ảnh và âm thanh ở đây

/**
 * @swagger
 * /songs:
 *   get:
 *     summary: Get all songs
 *     tags: [Songs]
 *     responses:
 *       200:
 *         description: List of all songs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                   id:
 *                     type: string
 *                   lyrics:
 *                     type: string
 *                   duration:
 *                     type: number
 *                   releasedate:
 *                     type: string
 *                     format: date
 *                   is_explicit:
 *                     type: boolean
 *                   imageUrl:
 *                     type: string
 *                   audio:
 *                     type: string
 *                   playcountId:
 *                     type: integer
 *                   artistIds:
 *                     type: array
 *                     items:
 *                       type: string
 *                   albumIds:
 *                     type: array
 *                     items:
 *                       type: string
 *                   genreIds:
 *                     type: array
 *                     items:
 *                       type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Internal server error
 */
router.get("/", songRoutes.getAllSongs);

/**
 * @swagger
 * /songs/{songId}:
 *   get:
 *     summary: Get song by ID
 *     tags: [Songs]
 *     parameters:
 *       - in: path
 *         name: songId
 *         required: true
 *         schema:
 *           type: string
 *         description: The song document ID
 *     responses:
 *       200:
 *         description: Song retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Song retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: abc123
 *                     title:
 *                       type: string
 *                       example: My Song
 *                     lyrics:
 *                       type: string
 *                     duration:
 *                       type: number
 *                     releasedate:
 *                       type: string
 *                       format: date
 *                     is_explicit:
 *                       type: boolean
 *                     imageUrl:
 *                       type: string
 *                       example: image_url.jpg
 *                     audio:
 *                       type: string
 *                       example: audio_url.mp3
 *                     playcountId:
 *                       type: integer
 *                       example: 0
 *                     artistIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                     albumIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                     genreIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Song not found
 *       500:
 *         description: Internal server error
 */
router.get("/:songId", songRoutes.getSongById);

/**
 * @swagger
 * /songs/{songId}:
 *   put:
 *     summary: Update a song
 *     tags: [Songs]
 *     parameters:
 *       - in: path
 *         name: songId
 *         required: true
 *         schema:
 *           type: string
 *         description: The song document ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: The title of the song
 *               lyrics:
 *                 type: string
 *                 description: The lyrics of the song
 *               duration:
 *                 type: number
 *                 description: Duration of the song
 *               releasedate:
 *                 type: string
 *                 format: date
 *               is_explicit:
 *                 type: boolean
 *                 description: Whether the song is explicit or not
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file for the song (optional)
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Audio file for the song (optional)
 *               artistIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               albumIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               genreIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Song updated successfully
 *       404:
 *         description: Song not found
 *       400:
 *         description: Bad request (e.g. missing fields)
 */
router.put("/:songId", uploadSong, songRoutes.updateSong);

/**
 * @swagger
 * /songs/{songId}:
 *   delete:
 *     summary: Delete a song
 *     tags: [Songs]
 *     parameters:
 *       - in: path
 *         name: songId
 *         required: true
 *         schema:
 *           type: string
 *         description: The song document ID
 *     responses:
 *       200:
 *         description: Song deleted successfully
 *       404:
 *         description: Song not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:songId", songRoutes.deleteSong);



module.exports = router;
