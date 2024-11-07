const SongModel = require('../models/songModel');
const { uploadToStorage } = require("../middlewares/uploadMiddleware");
const { bucket } = require("../config/firebase");


const getAllSongs = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const searchName = req.query.searchName || '';
  const minDuration = parseInt(req.query.minDuration) || 0;
  const maxDuration = parseInt(req.query.maxDuration) || 0;
  const minListensCount = parseInt(req.query.minListensCount) || 0;
  const maxListensCount = parseInt(req.query.maxListensCount) || 0;
  
  let genres;

  if (req.query.genres) {
    try {
      genres = JSON.parse(req.query.genres);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid genres format. Must be a valid JSON array.' });
    }
  }

  if (!req.query.page && !req.query.limit) {
    try {
      const songs = await SongModel.getAllSongs(false, null, null, searchName, genres, minDuration, maxDuration, minListensCount,maxListensCount);
      return res.status(200).json({ songs });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error retrieving songs', error: error.message });
    }
  }

  if (page < 1 || limit < 1) {
    return res.status(400).json({ message: 'Page and limit must be greater than 0.' });
  }

  try {

    const songs = await SongModel.getAllSongs(true, page, limit, searchName, genres, minDuration, maxDuration, minListensCount,maxListensCount);
    const totalCount = await SongModel.getSongCount();
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      songs,
      totalPages,
      totalCount,
      limit,
      currentPage: page
    });

  } catch (error) {
    console.error(error);
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
      is_explicit: is_explicit || 0,
      listens_count: 0,
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
    const genreIDs = Array.isArray(genreID) ? genreID : [genreID].filter(id => id); // Đảm bảo genreID hợp lệ
    const albumIDs = Array.isArray(albumID) ? albumID : [albumID].filter(id => id); // Đảm bảo albumID hợp lệ

    if (artistIDs.length > 0) await SongModel.insertArtists(songId, artistIDs);

    // Kiểm tra và thêm genreID
    if (genreIDs.length > 0) await SongModel.insertGenres(songId, genreIDs);

    // Kiểm tra và thêm albumID
    if (albumIDs.length > 0) await SongModel.insertAlbums(songId, albumIDs);

    res.status(200).json({ id: songId, ...newSong });
  } catch (error) {
    console.error('Error creating song:', error);
    res.status(500).json({ message: 'Error creating song', error: error.message });
  }
};

const updateSong = async (req, res) => {
  try {
    const { id } = req.params;

    // Lấy thông tin bài hát hiện tại
    const existingSong = await SongModel.getSongById(id);
    if (!existingSong) {
      return res.status(404).json({ message: 'Song not found' });
    }

    const {
      title,
      artistID,
      albumID,
      genreID,
      lyrics,
      duration,
      releaseDate,
      is_explicit,
    } = req.body;

    // Tạo đối tượng mới với dữ liệu cập nhật
    const updatedSong = {
      title: title !== undefined ? title : existingSong.title,
      lyrics: lyrics !== undefined ? lyrics : existingSong.lyrics,
      duration: duration !== undefined ? duration : existingSong.duration,
      releaseDate: releaseDate !== undefined ? releaseDate : existingSong.releaseDate,
      is_explicit: is_explicit !== undefined ? is_explicit : existingSong.is_explicit,
      listens_count: existingSong.listens_count, // Giữ nguyên số lần nghe
      image: existingSong.image, // Giữ nguyên hình ảnh cũ
      file_song: existingSong.file_song // Giữ nguyên file nhạc cũ
    };

    // Xử lý upload hình ảnh nếu có
    if (req.files) {
      if (req.files.image && req.files.image.length > 0) {
        const imageFile = req.files.image[0];
        const imagePublicUrl = await uploadToStorage(imageFile, 'songs/images');
        updatedSong.image = imagePublicUrl;
      }
      if (req.files.file_song && req.files.file_song.length > 0) {
        const audioFile = req.files.file_song[0];
        const audioPublicUrl = await uploadToStorage(audioFile, 'songs/audio');
        updatedSong.file_song = audioPublicUrl;
      }
    }

    await SongModel.deleteArtistAssociations(id);
    await SongModel.deleteAlbumAssociations(id);
    await SongModel.deleteGenreAssociations(id);

    if (artistID) {
      const artistIDs = Array.isArray(artistID) ? artistID : [artistID];
      await SongModel.insertArtists(id, artistIDs);
    }

    if (albumID) {
      const albumIDs = Array.isArray(albumID) ? albumID : [albumID];
      await SongModel.insertAlbums(id, albumIDs);
    }

    if (genreID) {
      const genreIDs = Array.isArray(genreID) ? genreID : [genreID];
      await SongModel.insertGenres(id, genreIDs);
    }

    await SongModel.updateSong(id, updatedSong);

    console.log({ genreID, albumID, artistID });

    res.status(200).json({ id, ...updatedSong });
  } catch (error) {
    console.error('Error updating song:', error);
    res.status(500).json({ message: 'Error updating song', error: error.message });
  }
};


const deleteSong = async (req, res) => {
  try {
    const { id } = req.params;

    const existingSong = await SongModel.getSongById(id);
    if (!existingSong) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    // Kiểm tra xem có hình ảnh hay không và định dạng có đúng hay không
    if (existingSong.image) {
      // Tạo đường dẫn tệp từ URL
      const oldImagePath = existingSong.image.replace('https://storage.googleapis.com/', '').replace('be-musicheals-a6d7a.appspot.com/', '');
      try {
        // Xóa hình ảnh
        await bucket.file(oldImagePath).delete();
        console.log("Image deleted successfully.");
      } catch (error) {
        console.error("Error deleting old image:", error);
        return res.status(500).json({ message: 'Error deleting old image', error: error.message });
      }
    }
    if (existingSong.file_song) {
      // Tạo đường dẫn tệp từ URL
      const oldAudioPath = existingSong.file_song.replace('https://storage.googleapis.com/', '').replace('be-musicheals-a6d7a.appspot.com/', '');
      try {
        // Xóa audio
        await bucket.file(oldAudioPath).delete();
        console.log("Audio deleted successfully.");
      } catch (error) {
        console.error("Error deleting old audio:", error);
        return res.status(500).json({ message: 'Error deleting old audio', error: error.message });
      }
    }
    await SongModel.deleteSong(id);
    res.json({ message: 'deleted successfully' });
  } catch (error) {
    console.error('Error deleting genre:', error);
    res.status(500).json({ message: 'Error deleting genre', error: error.message });
  }
};




module.exports = { getAllSongs, getSongById, createSong, updateSong, deleteSong };
