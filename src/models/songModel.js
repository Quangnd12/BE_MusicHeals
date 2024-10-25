const { db, bucket } = require('../config/firebase');
const { uploadAudio, uploadImage } = require('../middlewares/uploadMiddleware');

class SongModel {
    // Get all songs with filtering, sorting, and pagination
    static async getAllSongs(limit = 50, startAfter, sortBy = 'title', filters) {
        try {
            let query = db.collection('songs');

            // Apply filters if provided
            if (filters) {
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

            return { message: "Songs retrieved successfully", data: songs };
        } catch (error) {
            console.error('Error getting songs:', error);
            throw new Error("Error retrieving songs");
        }
    }

    // Create a new song
    static async createSong(songData) {
        try {
            const { title, artistIds, albumIds, genreIds, lyrics, duration, releasedate, is_explicit, file_song, image } = songData;

            // Create song document
            const songDocument = {
                title,
                artistIds: artistIds || [],
                albumIds: albumIds || [],
                genreIds: genreIds || [],
                playcountId: 0,
                lyrics: lyrics || "",
                duration: duration || 0,
                releasedate: releasedate || new Date().toISOString().split('T')[0],
                is_explicit: is_explicit === 'true',
                file_song,
                image,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const songRef = await db.collection('songs').add(songDocument);
            return {
                message: "Song created successfully",
                data: { songId: songRef.id, ...songDocument }
            };
        } catch (error) {
            console.error('Error creating song:', error);
            throw new Error("Error creating song");
        }
    }

    // Get a song by ID
    static async getSongById(songId) {
        try {
            const songDoc = await db.collection('songs').doc(songId).get();

            if (!songDoc.exists) {
                throw new Error("Song not found");
            }

            return {
                message: "Song retrieved successfully",
                data: { songId: songDoc.id, ...songDoc.data() }
            };
        } catch (error) {
            console.error('Error getting song:', error);
            throw new Error("Error retrieving song");
        }
    }

    // Update a song
    static async updateSong(songId, updates) {
        try {
            const songDoc = await db.collection('songs').doc(songId).get();

            if (!songDoc.exists) {
                throw new Error("Song not found");
            }

            updates.updatedAt = new Date();

            await db.collection('songs').doc(songId).update(updates);
            const updatedDoc = await db.collection('songs').doc(songId).get();

            return {
                message: "Song updated successfully",
                data: { songId: updatedDoc.id, ...updatedDoc.data() }
            };
        } catch (error) {
            console.error('Error updating song:', error);
            throw new Error("Error updating song");
        }
    }

    // Delete a song
    static async deleteSong(songId) {
        try {
            const songDoc = await db.collection('songs').doc(songId).get();

            if (!songDoc.exists) {
                throw new Error("Song not found");
            }

            // Delete audio file from Firebase Storage if exists
            if (songDoc.data().file_song) {
                const audioFileName = songDoc.data().file_song.split('/').pop();
                await bucket.file(`audio/${audioFileName}`).delete();
            }

            // Delete image file from Firebase Storage if exists
            if (songDoc.data().image) {
                const imageFileName = songDoc.data().image.split('/').pop();
                await bucket.file(`images/${imageFileName}`).delete();
            }

            // Delete song document from Firestore
            await db.collection('songs').doc(songId).delete();

            return { message: "Song deleted successfully" };
        } catch (error) {
            console.error('Error deleting song:', error);
            throw new Error("Error deleting song");
        }
    }

    // Get songs by artist
    static async getSongsByArtist(artistId, limit = 50, startAfter) {
        try {
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

            return {
                message: "Songs retrieved successfully",
                data: songs
            };
        } catch (error) {
            console.error('Error getting songs by artist:', error);
            throw new Error("Error retrieving songs");
        }
    }
}

module.exports = SongModel;
