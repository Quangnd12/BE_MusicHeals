const express = require("express");
const albumRoutes = require("../controllers/albumController");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Albums
 *   description: API for managing albums
 */

/**
 * @swagger
 * /albums:
 *   post:
 *     summary: Create a new album
 *     tags: [Albums]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               image:
 *                 type: string
 *               artistId:
 *                 type: number
 *               songId:
 *                 type: number
 *               describe:
 *                 type: string
 *               totalTracks:
 *                 type: integer
 *               popularity:
 *                 type: integer
 *               releaseDate:
 *                 type: string
 *     responses:
 *       201:
 *         description: Album created successfully
 *       400:
 *         description: Bad request (e.g. missing fields)
 */
router.post("/", albumRoutes.createAlbum);

/**
 * @swagger
 * /albums:
 *   get:
 *     summary: Get all albums
 *     tags: [Albums]
 *     responses:
 *       200:
 *         description: List of all albums
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
 *                   image:
 *                     type: string
 *                   artistId:
 *                     type: number
 *                   songId:
 *                     type: number
 *                   describe:
 *                     type: string
 *                   totalTracks:
 *                     type: integer
 *                   popularity:
 *                     type: integer
 *                   releaseDate:
 *                     type: string
 *       500:
 *         description: Internal server error
 */
router.get("/", albumRoutes.getAllAlbums);

/**
 * @swagger
 * /albums/{albumId}:
 *   get:
 *     summary: Get album by ID
 *     tags: [Albums]
 *     parameters:
 *       - in: path
 *         name: albumId
 *         required: true
 *         schema:
 *           type: string
 *         description: The album document ID
 *     responses:
 *       200:
 *         description: Album retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Album retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: abc123
 *                     title:
 *                       type: string
 *                       example: Rock Classics
 *                     image:
 *                       type: string
 *                     artistId:
 *                       type: number
 *                     songId:
 *                       type: number
 *                     describe:
 *                       type: string
 *                     totalTracks:
 *                       type: integer
 *                     popularity:
 *                       type: integer
 *                     releaseDate:
 *                       type: string
 *       404:
 *         description: Album not found
 *       500:
 *         description: Internal server error
 */
router.get("/:albumId", albumRoutes.getAlbumById);

/**
 * @swagger
 * /albums/{albumId}:
 *   put:
 *     summary: Update an album
 *     tags: [Albums]
 *     parameters:
 *       - in: path
 *         name: albumId
 *         required: true
 *         schema:
 *           type: string
 *         description: The album document ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               image:
 *                 type: string
 *               artistId:
 *                 type: number
 *               songId:
 *                 type: number
 *               describe:
 *                 type: string
 *               totalTracks:
 *                 type: integer
 *               popularity:
 *                 type: integer
 *               releaseDate:
 *                 type: string
 *     responses:
 *       200:
 *         description: Album updated successfully
 *       404:
 *         description: Album not found
 *       400:
 *         description: Bad request (e.g. missing fields)
 */
router.put("/:albumId", albumRoutes.updateAlbum);

/**
 * @swagger
 * /albums/{albumId}:
 *   delete:
 *     summary: Delete an album
 *     tags: [Albums]
 *     parameters:
 *       - in: path
 *         name: albumId
 *         required: true
 *         schema:
 *           type: string
 *         description: The album document ID
 *     responses:
 *       200:
 *         description: Album deleted successfully
 *       404:
 *         description: Album not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:albumId", albumRoutes.deleteAlbum);

module.exports = router;
