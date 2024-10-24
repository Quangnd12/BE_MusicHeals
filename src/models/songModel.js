const { db } = require("../config/firebase");
const { uploadAudio, uploadImage } = require('../middlewares/uploadAudioMiddleware');
const { CustomAPIError, statusCodes } = require("../errors");

class SongModel {
  constructor() {
    this.collection = db.collection("songs");
  }

  async getAllSongs(limit = 50, startAfter = null, sortBy = 'title', filterBy = {}) {
    try {
      let query = this.collection.orderBy(sortBy);

      if (startAfter) {
        const startAfterDoc = await this.collection.doc(startAfter).get();
        if (startAfterDoc.exists) {
          query = query.startAfter(startAfterDoc);
        }
      }

      Object.entries(filterBy).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.where(key, 'array-contains-any', value);
        } else {
          query = query.where(key, '==', value);
        }
      });

      const snapshot = await query.limit(limit).get();

      return snapshot.docs.map(doc => ({
        songId: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw new CustomAPIError("Failed to get songs: " + error.message, statusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async getSongById(songId) {
    try {
      const doc = await this.collection.doc(songId).get();
      if (!doc.exists) {
        throw new CustomAPIError("Song not found", statusCodes.NOT_FOUND);
      }
      return { songId: doc.id, ...doc.data() };
    } catch (error) {
      if (error instanceof CustomAPIError) {
        throw error;
      }
      throw new CustomAPIError("Failed to get song: " + error.message, statusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async createSong(songData) {
    try {
      const { image, file_song, artistIds = [], albumIds = [], genreIds = [], ...restData } = songData;

      if (!file_song) {
        throw new CustomAPIError("Audio file is required", statusCodes.BAD_REQUEST);
      }

      let imageUrl = null;
      let audioUrl = null;

      try {
        if (image) {
          imageUrl = await uploadImage(image);
        }
        audioUrl = await uploadAudio(file_song);
      } catch (uploadError) {
        throw new CustomAPIError("Failed to upload files: " + uploadError.message, statusCodes.INTERNAL_SERVER_ERROR);
      }

      const newSongRef = await this.collection.add({
        ...restData,
        artistIds: Array.isArray(artistIds) ? artistIds : [], // Ensure artistIds is an array
        albumIds: Array.isArray(albumIds) ? albumIds : [], // Ensure albumIds is an array
        genreIds: Array.isArray(genreIds) ? genreIds : [], // Ensure genreIds is an array
        image: imageUrl,
        file_song: audioUrl,
        playcountId: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const newSong = await newSongRef.get();
      return { songId: newSong.id, ...newSong.data() };
    } catch (error) {
      if (error instanceof CustomAPIError) {
        throw error;
      }
      throw new CustomAPIError("Failed to create song: " + error.message, statusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async updateSong(songId, updateData) {
    try {
      const songRef = this.collection.doc(songId);
      const song = await songRef.get();

      if (!song.exists) {
        throw new CustomAPIError("Song not found", statusCodes.NOT_FOUND);
      }

      const { image, file_song, artistIds = [], albumIds = [], genreIds = [], ...restData } = updateData;

      try {
        if (image) {
          restData.image = await uploadImage(image);
        }
        if (file_song) {
          restData.file_song = await uploadAudio(file_song);
        }
      } catch (uploadError) {
        throw new CustomAPIError("Failed to upload files: " + uploadError.message, statusCodes.INTERNAL_SERVER_ERROR);
      }

      restData.artistIds = Array.isArray(artistIds) ? artistIds : []; // Ensure artistIds is an array
      restData.albumIds = Array.isArray(albumIds) ? albumIds : []; // Ensure albumIds is an array
      restData.genreIds = Array.isArray(genreIds) ? genreIds : []; // Ensure genreIds is an array

      await songRef.update({
        ...restData,
        updatedAt: new Date()
      });

      return this.getSongById(songId);
    } catch (error) {
      if (error instanceof CustomAPIError) {
        throw error;
      }
      throw new CustomAPIError("Failed to update song: " + error.message, statusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteSong(songId) {
    try {
      const songRef = this.collection.doc(songId);
      const song = await songRef.get();

      if (!song.exists) {
        throw new CustomAPIError("Song not found", statusCodes.NOT_FOUND);
      }

      await songRef.delete();
    } catch (error) {
      if (error instanceof CustomAPIError) {
        throw error;
      }
      throw new CustomAPIError("Failed to delete song: " + error.message, statusCodes.INTERNAL_SERVER_ERROR);
    }
  }
}

module.exports = new SongModel();
