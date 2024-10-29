const express = require("express");
const topRankRoutes = require("../controllers/topRankController");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: TopRanks
 *   description: API for managing TopRanks
 */

/**
 * @swagger
 * /topRanks:
 *   post:
 *     summary: Create a new TopRank
 *     tags: [TopRanks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the TopRank
 *               genres:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: TopRank created successfully
 *       400:
 *         description: Bad request (e.g., missing fields)
 *       500:
 *         description: Internal server error
 */
router.post("/", topRankRoutes.createTopRank);

/**
 * @swagger
 * /topRanks:
 *   get:
 *     summary: Get all TopRanks
 *     tags: [TopRanks]
 *     responses:
 *       200:
 *         description: List of all TopRanks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   genres:
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
router.get("/", topRankRoutes.getAllTopRanks);

/**
 * @swagger
 * /topRanks/{rankId}:
 *   get:
 *     summary: Get TopRank by ID
 *     tags: [TopRanks]
 *     parameters:
 *       - in: path
 *         name: rankId
 *         required: true
 *         schema:
 *           type: string
 *         description: The TopRank document ID
 *     responses:
 *       200:
 *         description: TopRank retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: TopRank retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: rank123
 *                     title:
 *                       type: string
 *                       example: Top Pop Songs
 *                     genres:
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
 *         description: TopRank not found
 *       500:
 *         description: Internal server error
 */
router.get("/:rankId", topRankRoutes.getTopRankById);

/**
 * @swagger
 * /topRanks/{rankId}:
 *   put:
 *     summary: Update a TopRank
 *     tags: [TopRanks]
 *     parameters:
 *       - in: path
 *         name: rankId
 *         required: true
 *         schema:
 *           type: string
 *         description: The TopRank document ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               genres:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: TopRank updated successfully
 *       404:
 *         description: TopRank not found
 *       400:
 *         description: Bad request (e.g., missing fields)
 *       500:
 *         description: Internal server error
 */
router.put("/:rankId", topRankRoutes.updateTopRank);

/**
 * @swagger
 * /topRanks/{rankId}:
 *   delete:
 *     summary: Delete a TopRank
 *     tags: [TopRanks]
 *     parameters:
 *       - in: path
 *         name: rankId
 *         required: true
 *         schema:
 *           type: string
 *         description: The TopRank document ID
 *     responses:
 *       200:
 *         description: TopRank deleted successfully
 *       404:
 *         description: TopRank not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:rankId", topRankRoutes.deleteTopRank);

module.exports = router;
