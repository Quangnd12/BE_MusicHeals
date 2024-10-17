const express = require("express");
const favoriteRoutes = require("../controllers/favoriteController");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Favorites
 *   description: API for managing user favorites
 */

/**
 * @swagger
 * /favorites:
 *   post:
 *     summary: Add a new favorite
 *     tags: [Favorites]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: number
 *               songId:
 *                 type: number
 *               albumId:
 *                 type: number
 *               playlistId:
 *                 type: number
 *     responses:
 *       201:
 *         description: Favorite added successfully
 *       400:
 *         description: Bad request (e.g. missing fields)
 */
router.post("/", favoriteRoutes.createFavorite);

/**
 * @swagger
 * /favorites:
 *   get:
 *     summary: Get all favorites for the user
 *     tags: [Favorites]
 *     responses:
 *       200:
 *         description: List of all favorites
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: number
 *                   songId:
 *                     type: number
 *                   albumId:
 *                     type: number
 *                   playlistId:
 *                     type: number
 *                   created:
 *                     type: string
 *       500:
 *         description: Internal server error
 */
router.get("/", favoriteRoutes.getAllFavorites);

/**
 * @swagger
 * /favorites/{favoriteId}:
 *   get:
 *     summary: Get a favorite by ID
 *     tags: [Favorites]
 *     parameters:
 *       - in: path
 *         name: favoriteId
 *         required: true
 *         schema:
 *           type: number
 *         description: The favorite document ID
 *     responses:
 *       200:
 *         description: Favorite retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: number
 *                   example: 123
 *                 songId:
 *                   type: number
 *                   example: 456
 *                 albumId:
 *                   type: number
 *                   example: 789
 *                 playlistId:
 *                   type: number
 *                   example: 101112
 *       404:
 *         description: Favorite not found
 *       500:
 *         description: Internal server error
 */
router.get("/:favoriteId", favoriteRoutes.getFavoriteById);


/**
 * @swagger
 * /favorites/{favoriteId}:
 *   delete:
 *     summary: Delete a favorite
 *     tags: [Favorites]
 *     parameters:
 *       - in: path
 *         name: favoriteId
 *         required: true
 *         schema:
 *           type: number
 *         description: The favorite document ID
 *     responses:
 *       200:
 *         description: Favorite deleted successfully
 *       404:
 *         description: Favorite not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:favoriteId", favoriteRoutes.deleteFavorite);

module.exports = router;
