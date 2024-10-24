// routes/songRoutes.js
const express = require("express");
const router = express.Router();
const SongController = require("../controllers/songController");
const { handleUpload } = require("../middlewares/uploadAudioMiddleware");

/**
 * @swagger
 * components:
 *   schemas:
 *     Song:
 *       type: object
 *       required:
 *         - title
 *         - artistIds
 *       properties:
 *         songId:
 *           type: string
 *           description: Auto-generated song ID
 *         title:
 *           type: string
 *           description: Song title
 *         artistIds:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of artist IDs
 *         albumIds:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of album IDs
 *         genreIds:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of genre IDs
 *         playcountId:
 *           type: integer
 *           description: Number of times played
 *         lyrics:
 *           type: string
 *           description: Song lyrics
 *         duration:
 *           type: number
 *           description: Song duration in seconds
 *         releasedate:
 *           type: string
 *           format: date
 *           description: Release date
 *         is_explicit:
 *           type: boolean
 *           description: Whether song contains explicit content
 *         file_song:
 *           type: string
 *           description: Firebase Storage URL for the audio file
 *         image:
 *           type: string
 *           description: Firebase Storage URL for the cover image
 *   
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         statusCode:
 *           type: integer
 */

/**
 * @swagger
 * /songs:
 *   get:
 *     summary: Retrieve a list of songs
 *     tags: [Songs]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of songs to return
 *       - in: query
 *         name: startAfter
 *         schema:
 *           type: string
 *         description: ID of the last song from previous page for pagination
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [title, releasedate, playcountId]
 *         default: title
 *         description: Field to sort by
 *       - in: query
 *         name: filterBy
 *         schema:
 *           type: string
 *         description: JSON string of filter criteria
 *     responses:
 *       200:
 *         description: A list of songs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Song'
 *             example:
 *               message: "Songs retrieved successfully"
 *               data: 
 *                 - songId: "1"
 *                   title: "Example Song"
 *                   artistIds: ["artist1", "artist2"]
 *                   albumIds: ["album1"]
 *                   genreIds: ["genre1", "genre2"]
 *                   playcountId: 1000
 *                   duration: 180
 *                   releasedate: "2023-01-01"
 *                   is_explicit: false
 *                   file_song: "https://firebasestorage.googleapis.com/example-song.mp3"
 *                   image: "https://firebasestorage.googleapis.com/example-cover.jpg"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", SongController.getAllSongs);

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
 *             required:
 *               - title
 *               - artistIds
 *               - file_song
 *             properties:
 *               title:
 *                 type: string
 *               artistIds:
 *                 type: array
 *                 description: JSON string array of artist IDs e.g. "[\"artist1\",\"artist2\"]"
 *               albumIds:
 *                 type: array
 *                 description: JSON string array of album IDs e.g. "[\"album1\",\"album2\"]"
 *               genreIds:
 *                 type: array
 *                 description: JSON string array of genre IDs e.g. "[\"genre1\",\"genre2\"]"
 *               file_song:
 *                 type: string
 *                 format: binary
 *               image:
 *                 type: string
 *                 format: binary
 *               lyrics:
 *                 type: string
 *               duration:
 *                 type: number
 *               releasedate:
 *                 type: string
 *                 format: date
 *               is_explicit:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Song created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Song'
 *             example:
 *               message: "Song created successfully"
 *               data:
 *                 songId: "1"
 *                 title: "New Song"
 *                 artistIds: ["artist1", "artist2"]
 *                 albumIds: ["album1"]
 *                 genreIds: ["genre1", "genre2"]
 *                 playcountId: 0
 *                 duration: 180
 *                 releasedate: "2023-01-01"
 *                 is_explicit: false
 *                 file_song: "https://firebasestorage.googleapis.com/new-song.mp3"
 *                 image: "https://firebasestorage.googleapis.com/new-cover.jpg"
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", handleUpload, SongController.createSong);

/**
 * @swagger
 * /songs/{songId}:
 *   get:
 *     summary: Get a song by ID
 *     tags: [Songs]
 *     parameters:
 *       - in: path
 *         name: songId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Song details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Song'
 *             example:
 *               message: "Song retrieved successfully"
 *               data:
 *                 songId: "1"
 *                 title: "Example Song"
 *                 artistIds: ["artist1", "artist2"]
 *                 albumIds: ["album1"]
 *                 genreIds: ["genre1", "genre2"]
 *                 playcountId: 1000
 *                 duration: 180
 *                 releasedate: "2023-01-01"
 *                 is_explicit: false
 *                 file_song: "https://firebasestorage.googleapis.com/example-song.mp3"
 *                 image: "https://firebasestorage.googleapis.com/example-cover.jpg"
 *       404:
 *         description: Song not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:songId", SongController.getSongById);

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
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               artistIds:
 *                 type: array
 *                 description: JSON string array of artist IDs
 *               albumIds:
 *                 type: array
 *                 description: JSON string array of album IDs
 *               genreIds:
 *                 type: array
 *                 description: JSON string array of genre IDs
 *               file_song:
 *                 type: string
 *                 format: binary
 *               image:
 *                 type: string
 *                 format: binary
 *               lyrics:
 *                 type: string
 *               duration:
 *                 type: number
 *               releasedate:
 *                 type: string
 *                 format: date
 *               is_explicit:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Song updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Song'
 *             example:
 *               message: "Song updated successfully"
 *               data:
 *                 songId: "1"
 *                 title: "Updated Song"
 *                 artistIds: ["artist1", "artist2", "artist3"]
 *                 albumIds: ["album1", "album2"]
 *                 genreIds: ["genre1", "genre2"]
 *                 playcountId: 1000
 *                 duration: 200
 *                 releasedate: "2023-02-01"
 *                 is_explicit: true
 *                 file_song: "https://firebasestorage.googleapis.com/updated-song.mp3"
 *                 image: "https://firebasestorage.googleapis.com/updated-cover.jpg"
 *       404:
 *         description: Song not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/:songId", handleUpload, SongController.updateSong);

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
 *     responses:
 *       200:
 *         description: Song deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "Song deleted successfully"
 *       404:
 *         description: Song not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/:songId", SongController.deleteSong);

/**
 * @swagger
 * /songs/artist/{artistId}:
 *   get:
 *     summary: Get songs by artist ID
 *     tags: [Songs]
 *     parameters:
 *       - in: path
 *         name: artistId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of songs to return
 *       - in: query
 *         name: startAfter
 *         schema:
 *           type: string
 *         description: ID of the last song from previous page for pagination
 *     responses:
 *       200:
 *         description: List of songs by the artist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Song'
 *             example:
 *               message: "Artist songs retrieved successfully"
 *               data: 
 *                 - songId: "1"
 *                   title: "Artist's Song 1"
 *                   artistIds: ["artist1"]
 *                   albumIds: ["album1"]
 *                   genreIds: ["genre1", "genre2"]
 *                   playcountId: 1000
 *                   duration: 180
 *                   releasedate: "2023-01-01"
 *                   is_explicit: false
 *                   file_song: "https://firebasestorage.googleapis.com/artist-song-1.mp3"
 *                   image: "https://firebasestorage.googleapis.com/artist-cover-1.jpg"
 *       404:
 *         description: Artist or songs not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/artist/:artistId", SongController.getSongsByArtist);

module.exports = router;
