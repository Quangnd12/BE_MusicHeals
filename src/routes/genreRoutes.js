const express = require("express");
const genreRoutes = require("../controllers/genreController");
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const ImageUrl = upload.single('image');  // Multer middleware để upload hình ảnh

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Genres
 *   description: API for managing genres
 */

/**
 * @swagger
 * /genres:
 *   post:
 *     summary: Create a new genre
 *     tags: [Genres]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary  # Đây là file ảnh, đúng rồi
 *               subgenres:
 *                 type: array
 *                 items:
 *                   type: string  # Các subgenre có thể là chuỗi (string) hoặc object tùy theo yêu cầu
 *     responses:
 *       201:
 *         description: Genre created successfully
 *       400:
 *         description: Bad request (e.g. missing fields)
 */
router.post("/", ImageUrl, genreRoutes.createGenre);  // Xử lý upload ảnh ở đây

/**
* @swagger
* /genres:
*   get:
*     summary: Get all genres
*     tags: [Genres]
*     responses:
*       200:
*         description: List of all genres
*         content:
*           application/json:
*             schema:
*               type: array
*               items:
*                 type: object
*                 properties:
*                   name:
*                     type: string
*                   id:
*                     type: string
*                   description:
*                     type: string
*                   image:
*                     type: string
*                   subgenres:    
*                     type: array
*                     items:
*                       type: string
*       500:
*         description: Internal server error
*/
router.get("/", genreRoutes.getAllGenres);

/**
 * @swagger
 * /genres/{genreId}:
 *   get:
 *     summary: Get genre by ID
 *     tags: [Genres]
 *     parameters:
 *       - in: path
 *         name: genreId
 *         required: true
 *         schema:
 *           type: string
 *         description: The genre document ID
 *     responses:
 *       200:
 *         description: Genre retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Genre retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: abc123
 *                     name:
 *                       type: string
 *                       example: Rock
 *                     description:
 *                       type: string
 *                     image:
 *                       type: string
 *                       example: Rock music genre
 *                     subgenres:  # Subgenres là mảng các chuỗi hoặc object nếu có thêm thông tin
 *                       type: array
 *                       items:
 *                         type: string
 *       404:
 *         description: Genre not found
 *       500:
 *         description: Internal server error
 */
router.get("/:genreId", genreRoutes.getGenreById);

/**
 * @swagger
 * /genres/{genreId}:
 *   put:
 *     summary: Update a genre
 *     tags: [Genres]
 *     parameters:
 *       - in: path
 *         name: genreId
 *         required: true
 *         schema:
 *           type: string
 *         description: The genre document ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the genre
 *               description:
 *                 type: string
 *                 description: A description of the genre
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file for the genre (optional)
 *               subgenres:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: A list of subgenres related to the genre
 *     responses:
 *       200:
 *         description: Genre updated successfully
 *       404:
 *         description: Genre not found
 *       400:
 *         description: Bad request (e.g. missing fields)
 */
 router.put("/:genreId", ImageUrl, genreRoutes.updateGenre);


/**
 * @swagger
 * /genres/{genreId}:
 *   delete:
 *     summary: Delete a genre
 *     tags: [Genres]
 *     parameters:
 *       - in: path
 *         name: genreId
 *         required: true
 *         schema:
 *           type: string
 *         description: The genre document ID
 *     responses:
 *       200:
 *         description: Genre deleted successfully
 *       404:
 *         description: Genre not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:genreId", genreRoutes.deleteGenre);
/**
 * @swagger
 * /genres/multiple:
 *   delete:
 *     summary: Delete multiple genres by their IDs
 *     tags: [Genres]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               genreIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of genre IDs to delete
 *     responses:
 *       200:
 *         description: Multiple genres deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deletedCount:
 *                   type: integer
 *       400:
 *         description: Bad request (e.g. missing or invalid genreIds)
 *       404:
 *         description: No genres found with the given IDs
 *       500:
 *         description: Internal server error
 */
router.delete("/multiple", genreRoutes.deleteGenreAll);



module.exports = router;

