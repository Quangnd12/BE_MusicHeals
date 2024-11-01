const SongModel = require('../models/songModel');
const GenreModel = require('../models/genreModel');
const AlbumModel = require('../models/albumModel');
const ArtistModel = require('../models/artistModel');
const { uploadToStorage } = require("../middlewares/uploadMiddleware");

const getAllSongs = async (req, res) => {
  try {
    const songs = await SongModel.getAllSongs(); // Sửa tên hàm
    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving songs', error: error.message });
  }
};


const getSongById = async (req, res) => {
  try {
    const { id } = req.params;
    const song = await SongModel.getSongById(id);

    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    res.json(song);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving song', error: error.message });
  }
};

// Tạo bài hát mới
const createSong = async (req, res) => {
  try {
    const { title, artistID, albumID, genreID, lyrics, duration, releaseDate, is_explicit } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!title || !artistID || !genreID) {
      return res.status(400).json({ message: 'Title, artistID, and genreID are required' });
    }

    const newSong = {
      title,
      lyrics: lyrics || null,
      duration,
      releaseDate,
      is_explicit: is_explicit || false,
      listens_count: 0 // Mặc định là 0
    };

    if (req.files) {
      // Xử lý upload hình ảnh nếu có
      if (req.files.image && req.files.image.length > 0) {
        const imageFile = req.files.image[0];
        const imagePublicUrl = await uploadToStorage(imageFile, 'songs/images');
        newSong.image = imagePublicUrl;
      }

      // Xử lý upload file nhạc nếu có
      if (req.files.file_song && req.files.file_song.length > 0) {
        const audioFile = req.files.file_song[0];
        const audioPublicUrl = await uploadToStorage(audioFile, 'songs/audio');
        newSong.file_song = audioPublicUrl;
      }
    }

    // Tạo bài hát trong database
    const songId = await SongModel.createSong(newSong);

    const artistIDs = Array.isArray(artistID) ? artistID : [artistID];
    const albumIDs = Array.isArray(albumID) ? albumID : [albumID];
    const genreIDs = Array.isArray(genreID) ? genreID : [genreID];

    if (artistIDs) await SongModel.insertArtists(songId, artistIDs);
    if (albumIDs) await SongModel.insertAlbums(songId, albumIDs);
    if (genreIDs) await SongModel.insertGenres(songId, genreIDs);

    res.status(200).json({ id: songId, ...newSong });
  } catch (error) {
    console.error('Error creating song:', error);
    res.status(500).json({ message: 'Error creating song', error: error.message });
  }
};


const updateSong = async (req, res) => {
  try {
    const { id } = req.params;
    const existingSong = await SongModel.getSongById(id);
    if (!existingSong) {
      return res.status(404).json({ message: 'Song not found' });
    }

    // Dữ liệu bài hát cần cập nhật
    const updatedSong = {
      title: req.body.title || existingSong.title,
      lyrics: req.body.lyrics || existingSong.lyrics,
      duration: req.body.duration || existingSong.duration,
      listens_count: req.body.listens_count !== undefined ? req.body.listens_count : existingSong.listens_count,
      releaseDate: req.body.releaseDate || existingSong.releaseDate,
      is_explicit: req.body.is_explicit !== undefined ? req.body.is_explicit : existingSong.is_explicit,
    };

    // Xử lý upload hình ảnh mới nếu có
    if (req.files && req.files.image && req.files.image.length > 0) {
      const imageFile = req.files.image[0];
      const imagePublicUrl = await uploadToStorage(imageFile, 'songs/images');
      updatedSong.image = imagePublicUrl;
    } else {
      updatedSong.image = existingSong.image;
    }

    // Xử lý upload file nhạc mới nếu có
    if (req.files && req.files.file_song && req.files.file_song.length > 0) {
      const audioFile = req.files.file_song[0];
      const audioPublicUrl = await uploadToStorage(audioFile, 'songs/audio');
      updatedSong.file_song = audioPublicUrl;
    } else {
      updatedSong.file_song = existingSong.file_song;
    }

    // Cập nhật bài hát trong database
    await SongModel.updateSong(id, updatedSong);

    const existingArtists = await ArtistModel.getArtistById(id);
    const existingAlbums = await AlbumModel.getAlbumById(id);
    const existingGenres = await GenreModel.getGenreById(id);

    // Lấy ID của nghệ sĩ, album và thể loại từ yêu cầu
    const artistIDs = Array.isArray(req.body.artistID) ? req.body.artistID : [req.body.artistID];
    const albumIDs = Array.isArray(req.body.albumID) ? req.body.albumID : [req.body.albumID];
    const genreIDs = Array.isArray(req.body.genreID) ? req.body.genreID : [req.body.genreID];

    // Xóa các mối quan hệ cũ
    await SongModel.deleteSongAssociations(id);

    // Thêm các mối quan hệ mới hoặc giữ nguyên nếu không có cập nhật
    await SongModel.insertArtists(id, artistIDs.length > 0 ? artistIDs : existingArtists);
    await SongModel.insertAlbums(id, albumIDs.length > 0 ? albumIDs : existingAlbums);
    await SongModel.insertGenres(id, genreIDs.length > 0 ? genreIDs : existingGenres);

    res.json({ message: 'Song updated successfully', updatedSong });
  } catch (error) {
    console.error("Error updating song:", error);
    res.status(500).json({ message: "Error updating song", error: error.message });
  }
};

// Xóa bài hát theo ID
const deleteSong = async (req, res) => {
  try {
    const { id } = req.params;

    const existingSong = await SongModel.getSongById(id);
    if (!existingSong) {
      return res.status(404).json({ message: 'Song not found' });
    }

    if (existingSong.file_song && existingSong.file_song.includes("firebase")) {
      const oldFilePath = existingSong.file_song.split("/o/")[1].split("?")[0];
      try {
        await bucket.file(decodeURIComponent(oldFilePath)).delete();
      } catch (error) {
        console.error("Error deleting old file:", error);
      }
    }

    await SongModel.deleteSong(id);
    res.json({ message: 'Song deleted successfully' });
  } catch (error) {
    console.error('Error deleting song:', error);
    res.status(500).json({ message: 'Error deleting song', error: error.message });
  }


};

// lấy các bài hát theo khoảng thời lượng (duration) cụ thể
const getSongsByDuration = async (req, res) => {
  try {
    const { minDuration, maxDuration } = req.query;

    // Validate parameters
    if (!minDuration || !maxDuration) {
      return res.status(400).json({
        message: 'Both minDuration and maxDuration are required (in seconds)'
      });
    }

    const min = parseInt(minDuration);
    const max = parseInt(maxDuration);

    if (isNaN(min) || isNaN(max)) {
      return res.status(400).json({
        message: 'Duration values must be numbers'
      });
    }

    if (min > max) {
      return res.status(400).json({
        message: 'minDuration cannot be greater than maxDuration'
      });
    }

    const songs = await SongModel.getSongsByDuration(min, max);
    res.json(songs);
  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving songs',
      error: error.message
    });
  }
};
const getSongsByMood = async (req, res) => {
  try {
    const { mood } = req.query;
    if (!mood) {
      return res.status(400).json({ message: 'Mood parameter is required' });
    }

    const songs = await SongModel.getSongsByMood(mood);
    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving songs', error: error.message });
  }

};



module.exports = { getAllSongs, getSongById, createSong, updateSong, deleteSong, getSongsByDuration, getSongsByMood };
