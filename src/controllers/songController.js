const { db, bucket } = require('../config/firebase');
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

            // Ensure artistIds is an array even if empty
            const finalArtistIds = parsedArtistIds.length > 0 ? parsedArtistIds : [];

            // Upload files if provided
            let file_song_url = null;
            let image_url = null;

            let audioMetadata = {};
            if (req.files?.file_song) {
                const audioResult = await uploadAudio(req.files.file_song[0]);
                file_song_url = audioResult.url;

                // Lấy metadata từ audio
                audioMetadata = {
                    duration: audioResult.duration,
                    lyrics: audioResult.metadata.lyrics // Lấy lyrics từ metadata
                };
            }

            if (req.files?.image) {
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
                lyrics: audioMetadata.lyrics || "",
                duration: audioMetadata.duration || 0,
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
                    if (field.endsWith('Ids')) {
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
            if (req.files?.file_song) {
                const audioResult = await uploadAudio(req.files.file_song[0]);
                updates.file_song = audioResult.url;
                updates.duration = audioResult.duration; // Cập nhật duration
            }

            if (req.files?.image) {
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

            // Lấy dữ liệu bài hát
            const songData = songDoc.data();

            // Xóa tệp audio từ Firebase Storage nếu tồn tại
            if (songData.file_song) {
                const audioFileName = songData.file_song.split('/').pop();
                try {
                    await bucket.file(`audio/${audioFileName}`).delete();
                    console.log(`Audio file ${audioFileName} deleted successfully`);
                } catch (error) {
                    console.error(`Error deleting audio file: ${audioFileName}`, error);
                }
            }

            // Xóa tệp hình ảnh từ Firebase Storage nếu tồn tại
            if (songData.image) {
                const imageFileName = songData.image.split('/').pop();
                try {
                    await bucket.file(`images/${imageFileName}`).delete();
                    console.log(`Image file ${imageFileName} deleted successfully`);
                } catch (error) {
                    console.error(`Error deleting image file: ${imageFileName}`, error);
                }
            }

            // Xóa tài liệu bài hát khỏi Firestore
            await db.collection('songs').doc(songId).delete();

            res.json({
                message: "Song deleted successfully",
                statusCode: 200
            });

        } catch (error) {
            console.error('Error deleting song:', error);
            res.status(500).json({
                message: "Error deleting song",
                statusCode: 500,
                error: error.message
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
                songs.push({ songId: doc.id, ...doc.data() });
            });

            res.json({
                message: "Songs retrieved successfully",
                data: songs
            });
        } catch (error) {
            console.error('Error getting songs by artist:', error);
            res.status(500).json({
                message: "Error retrieving songs by artist",
                statusCode: 500
            });
        }
    }
}

module.exports = SongController;
