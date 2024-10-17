const express = require("express");
const genreRoutes = require("../controllers/genreController");

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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *               subgenres:       # Thêm subgenres vào
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Genre created successfully
 *       400:
 *         description: Bad request (e.g. missing fields)
 */
router.post("/", genreRoutes.createGenre);

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
 *                     subgenres:      # Thêm subgenres vào trong response
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *               subgenres:      
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Genre updated successfully
 *       404:
 *         description: Genre not found
 *       400:
 *         description: Bad request (e.g. missing fields)
 */
router.put("/:genreId", genreRoutes.updateGenre);

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

module.exports = router;
