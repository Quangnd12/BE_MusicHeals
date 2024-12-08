const ArtistSongModel = require('../models/artistSongModel');
const { uploadToStorage } = require('../middlewares/uploadMiddleware');
const { bucket } = require('../config/firebase');

// Thay đổi từ class sang object với các methods
const ArtistSongController = {
  async getGenresAndAlbums(req, res) {
    try {
      const artist_id = req.artist?.artist_id;
      
      if (!artist_id) {
        return res.status(401).json({ 
          message: "Không tìm thấy ID nghệ sĩ" 
        });
      }

      const [genres, albums] = await Promise.all([
        ArtistSongModel.getAllGenres(),
        ArtistSongModel.getAllAlbums(artist_id)
      ]);

      res.status(200).json({
        genres,
        albums
      });

    } catch (error) {
      console.error("Lỗi khi lấy danh sách thể loại và album:", error);
      res.status(500).json({
        message: "Lỗi server",
        error: error.message
      });
    }
  },

  async uploadSong(req, res) {
    try {
      const {
        title,
        albumID,
        genreID,
        duration,
        releaseDate,
        is_premium,
        lyrics
      } = req.body;

      const artist_id = req.artist.artist_id;

      if (!title || !genreID) {
        return res.status(400).json({
          message: "Thiếu thông tin bắt buộc"
        });
      }

      let imageUrl = null;
      let songUrl = null;

      if (req.files && req.files.image) {
        const imageFile = req.files.image[0];
        imageUrl = await uploadToStorage(imageFile, 'artist-songs/images');
      }

      if (req.files && req.files.file_song) {
        const songFile = req.files.file_song[0];
        songUrl = await uploadToStorage(songFile, 'artist-songs/audio');
      } else {
        return res.status(400).json({ 
          message: "File bài hát là bắt buộc" 
        });
      }

      const songData = {
        title,
        image: imageUrl,
        file_song: songUrl,
        albumID: Array.isArray(albumID) ? albumID : [albumID].filter(Boolean),
        genreID: Array.isArray(genreID) ? genreID : [genreID].filter(Boolean),
        duration: duration || null,
        releaseDate: releaseDate || null,
        is_premium: is_premium || 0,
        artist_id,
        lyrics: lyrics || null,
      };

      const songId = await ArtistSongModel.createSong(songData);
      res.status(201).json({
        message: "Tải lên bài hát thành công",
        songId
      });

    } catch (error) {
      console.error("Lỗi khi tải lên bài hát:", error);
      res.status(500).json({
        message: "Lỗi khi tải lên bài hát",
        error: error.message
      });
    }
  },

  async getArtistSongs(req, res) {
    try {
      const artist_id = req.artist?.artist_id;
      const status = req.query.status || null;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      if (!artist_id) {
        return res.status(401).json({ 
          message: "Không tìm thấy ID nghệ sĩ" 
        });
      }

      const result = await ArtistSongModel.getSongsByArtistId(
        parseInt(artist_id),
        status,
        page,
        limit
      );
      
      res.status(200).json(result);

    } catch (error) {
      console.error("Lỗi khi lấy danh sách bài hát:", error);
      res.status(500).json({
        message: "Lỗi khi lấy danh sách bài hát",
        error: error.message
      });
    }
  },

  async updateSong(req, res) {
    try {
      const { id } = req.params;
      const artist_id = req.artist?.artist_id;

      if (!artist_id) {
        return res.status(401).json({ 
          message: "Không tìm thấy ID nghệ sĩ" 
        });
      }

      const song = await ArtistSongModel.getSongById(id);
      if (!song || song.artist_id !== artist_id) {
        return res.status(404).json({ 
          message: "Không tìm thấy bài hát" 
        });
      }

      const updateData = { ...req.body };

      if (req.files) {
        if (req.files.image) {
          // Xóa ảnh cũ
          if (song.image) {
            const oldImagePath = song.image.split('/').pop();
            await bucket.file(`artist-songs/images/${oldImagePath}`).delete().catch(console.error);
          }
          // Upload ảnh mới
          updateData.image = await uploadToStorage(req.files.image[0], 'artist-songs/images');
        }

        if (req.files.file_song) {
          // Xóa file nhạc cũ
          if (song.file_song) {
            const oldSongPath = song.file_song.split('/').pop();
            await bucket.file(`artist-songs/audio/${oldSongPath}`).delete().catch(console.error);
          }
          // Upload file nhạc mới
          updateData.file_song = await uploadToStorage(req.files.file_song[0], 'artist-songs/audio');
        }
      }

      await ArtistSongModel.updateSong(id, updateData);

      res.status(200).json({
        message: "Cập nhật bài hát thành công"
      });

    } catch (error) {
      console.error("Lỗi khi cập nhật bài hát:", error);
      res.status(500).json({
        message: "Lỗi server",
        error: error.message
      });
    }
  },

  async deleteSong(req, res) {
    try {
      const { id } = req.params;
      const artist_id = req.artist?.artist_id;

      if (!artist_id) {
        return res.status(401).json({ 
          message: "Không tìm thấy ID nghệ sĩ" 
        });
      }

      const song = await ArtistSongModel.getSongById(id);
      if (!song || song.artist_id !== artist_id) {
        return res.status(404).json({ 
          message: "Không tìm thấy bài hát" 
        });
      }

      // Xóa files từ storage
      if (song.image) {
        const imagePath = song.image.split('/').pop();
        await bucket.file(`artist-songs/images/${imagePath}`).delete().catch(console.error);
      }

      if (song.file_song) {
        const songPath = song.file_song.split('/').pop();
        await bucket.file(`artist-songs/audio/${songPath}`).delete().catch(console.error);
      }

      await ArtistSongModel.deleteSong(id);

      res.status(200).json({
        message: "Xóa bài hát thành công"
      });

    } catch (error) {
      console.error("Lỗi khi xóa bài hát:", error);
      res.status(500).json({
        message: "Lỗi server",
        error: error.message
      });
    }
  }
};

module.exports = ArtistSongController; 