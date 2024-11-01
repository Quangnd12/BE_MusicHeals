const SongModel = require('../models/songModel'); 
const GenreModel = require('../models/genreModel');
const AlbumModel = require('../models/albumModel');
const ArtistModel = require('../models/artistModel');
const {uploadToStorage}=require("../middlewares/uploadMiddleware");

const getAllSongs = async (req, res) => {
  const page = parseInt(req.query.page) || 1; 
  const limit = parseInt(req.query.limit) || 10; 

  if (page < 1 || limit < 1) {
    return res.status(400).json({ message: 'Page and limit must be greater than 0.' });
  }

  try {
    const songs = await SongModel.getAllSongs(page, limit);
    const totalCount = await SongModel.getSongCount(); 
    const totalPages = Math.ceil(totalCount / limit); 
    res.json({songs, totalPages });
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

    // Cập nhật nghệ sĩ
    await SongModel.updateSong(id, updatedSong);

    // Cập nhật các quan hệ nếu có ID mới
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
    res.status(200).json({ id, ...updatedSong });
  } catch (error) {
    console.error('Error updating song:', error);
    res.status(500).json({ message: 'Error updating song', error: error.message });
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




module.exports = { getAllSongs, getSongById, createSong, updateSong, deleteSong};
