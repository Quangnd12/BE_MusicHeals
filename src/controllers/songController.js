const { db, storage } = require('../config/firebase');
const { uploadAudio, uploadImage } = require('../middlewares/uploadMiddleware');

class SongController {
    // Get all songs with filtering, sorting and pagination
    static async getAllSongs(req, res) {
        try {
            const { limit = 50, startAfter, sortBy = 'title', filterBy } = req.query;
            let query = db.collection('songs');

            // Apply filters if provided
            if (filterBy) {
                const filters = JSON.parse(filterBy);
                Object.keys(filters).forEach(key => {
                    query = query.where(key, '==', filters[key]);
                });
            }

            // Apply sorting
            query = query.orderBy(sortBy);

            // Apply pagination
            if (startAfter) {
                const startAfterDoc = await db.collection('songs').doc(startAfter).get();
                query = query.startAfter(startAfterDoc);
            }

            query = query.limit(parseInt(limit));

            const snapshot = await query.get();
            const songs = [];
            snapshot.forEach(doc => {
                songs.push({ songId: doc.id, ...doc.data() });
            });

            res.json({
                message: "Songs retrieved successfully",
                data: songs
            });
        } catch (error) {
            console.error('Error getting songs:', error);
            res.status(500).json({
                message: "Error retrieving songs",
                statusCode: 500
            });
        }
    }

    // Create new song
    static async createSong(req, res) {
        try {
            const {
                title,
                artistIds,
                albumIds,
                genreIds,
                lyrics,
                duration,
                releasedate,
                is_explicit
            } = req.body;

            // Validate required fields
            if (!title) {
                return res.status(400).json({
                    message: "Title is required",
                    statusCode: 400
                });
            }

            // Parse JSON strings for arrays
            const parsedArtistIds = artistIds ? JSON.parse(artistIds) : [];
            const parsedAlbumIds = albumIds ? JSON.parse(albumIds) : [];
            const parsedGenreIds = genreIds ? JSON.parse(genreIds) : [];

            // Nếu không có artistIds, đảm bảo nó là một mảng rỗng
            const finalArtistIds = parsedArtistIds.length > 0 ? parsedArtistIds : [];

            // Upload files if provided
            let file_song_url = null;
            let image_url = null;
            if (req.files.file_song) {
                const audioResult = await uploadAudio(req.files.file_song[0]);
                file_song_url = audioResult.url;
            }

            if (req.files.image) {
                const imageResult = await uploadImage(req.files.image[0]);
                image_url = imageResult.url;
            }

            // Create song document
            const songData = {
                title,
                artistIds: finalArtistIds,
                albumIds: parsedAlbumIds,
                genreIds: parsedGenreIds,
                playcountId: 0,
                lyrics: lyrics || "",
                duration: duration ? parseFloat(duration) : 0,
                releasedate: releasedate || new Date().toISOString().split('T')[0],
                is_explicit: is_explicit === 'true',
                file_song: file_song_url,
                image: image_url,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const songRef = await db.collection('songs').add(songData);

            res.status(201).json({
                message: "Song created successfully",
                data: {
                    songId: songRef.id,
                    ...songData
                }
            });
        } catch (error) {
            console.error('Error creating song:', error);
            res.status(500).json({
                message: "Error creating song",
                statusCode: 500
            });
        }
    }

    // Get song by ID
    static async getSongById(req, res) {
        try {
            const { songId } = req.params;
            const songDoc = await db.collection('songs').doc(songId).get();

            if (!songDoc.exists) {
                return res.status(404).json({
                    message: "Song not found",
                    statusCode: 404
                });
            }

            res.json({
                message: "Song retrieved successfully",
                data: {
                    songId: songDoc.id,
                    ...songDoc.data()
                }
            });
        } catch (error) {
            console.error('Error getting song:', error);
            res.status(500).json({
                message: "Error retrieving song",
                statusCode: 500
            });
        }
    }

    // Update song
    static async updateSong(req, res) {
        try {
            const { songId } = req.params;
            const songDoc = await db.collection('songs').doc(songId).get();

            if (!songDoc.exists) {
                return res.status(404).json({
                    message: "Song not found",
                    statusCode: 404
                });
            }
            const updates = {};
            const fields = [
                'title',
                'artistIds',
                'albumIds',
                'genreIds',
                'lyrics',
                'duration',
                'releasedate',
                'is_explicit'
            ];

            fields.forEach(field => {
                if (req.body[field] !== undefined) {
                    if (field === 'artistIds') {
                        // Xử lý artistIds và đảm bảo nó là một mảng rỗng nếu không có giá trị
                        updates[field] = req.body[field] ? JSON.parse(req.body[field]) : [];
                    } else if (field.endsWith('Ids')) {
                        updates[field] = req.body[field] ? JSON.parse(req.body[field]) : [];
                    } else if (field === 'duration') {
                        updates[field] = parseFloat(req.body[field]);
                    } else if (field === 'is_explicit') {
                        updates[field] = req.body[field] === 'true';
                    } else {
                        updates[field] = req.body[field];
                    }
                }
            });
            // Handle file updates
            if (req.files.file_song) {
                const audioResult = await uploadAudio(req.files.file_song[0]);
                updates.file_song = audioResult.url;
            }

            if (req.files.image) {
                const imageResult = await uploadImage(req.files.image[0]);
                updates.image = imageResult.url;
            }

            updates.updatedAt = new Date();

            await db.collection('songs').doc(songId).update(updates);

            const updatedDoc = await db.collection('songs').doc(songId).get();

            res.json({
                message: "Song updated successfully",
                data: {
                    songId: updatedDoc.id,
                    ...updatedDoc.data()
                }
            });
        } catch (error) {
            console.error('Error updating song:', error);
            res.status(500).json({
                message: "Error updating song",
                statusCode: 500
            });
        }
    }

    // Delete song
    static async deleteSong(req, res) {
        try {
            const { songId } = req.params;
            const songDoc = await db.collection('songs').doc(songId).get();

            if (!songDoc.exists) {
                return res.status(404).json({
                    message: "Song not found",
                    statusCode: 404
                });
            }

            // Delete files from Firebase Storage if they exist
            const songData = songDoc.data();
            if (songData.file_song) {
                const audioFileName = songData.file_song.split('/').pop();
                await storage.file(`audio/${audioFileName}`).delete().catch(console.error);
            }
            if (songData.image) {
                const imageFileName = songData.image.split('/').pop();
                await storage.file(`images/${imageFileName}`).delete().catch(console.error);
            }

            // Delete the document
            await db.collection('songs').doc(songId).delete();

            res.json({
                message: "Song deleted successfully"
            });
        } catch (error) {
            console.error('Error deleting song:', error);
            res.status(500).json({
                message: "Error deleting song",
                statusCode: 500
            });
        }
    }

    // Get songs by artist
    static async getSongsByArtist(req, res) {
        try {
            const { artistId } = req.params;
            const { limit = 50, startAfter } = req.query;

            let query = db.collection('songs')
                .where('artistIds', 'array-contains', artistId)
                .orderBy('title')
                .limit(parseInt(limit));

            if (startAfter) {
                const startAfterDoc = await db.collection('songs').doc(startAfter).get();
                query = query.startAfter(startAfterDoc);
            }

            const snapshot = await query.get();
            const songs = [];

            snapshot.forEach(doc => {
                songs.push({
                    songId: doc.id,
                    ...doc.data()
                });
            });

            if (songs.length === 0) {
                return res.status(404).json({
                    message: "No songs found for this artist",
                    statusCode: 404
                });
            }

            res.json({
                message: "Artist songs retrieved successfully",
                data: songs
            });
        } catch (error) {
            console.error('Error getting artist songs:', error);
            res.status(500).json({
                message: "Error retrieving artist songs",
                statusCode: 500
            });
        }
    }
}

module.exports = SongController;