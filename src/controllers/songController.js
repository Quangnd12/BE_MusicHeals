const SongModel = require("../models/songModel");

const getAllSongs = async (req, res) => {
  try {
    const songs = await SongModel.getAllSongs();
    res.json({
      message: "Songs retrieved successfully",
      data: songs,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSongById = async (req, res) => {
  try {
    const { songId } = req.params;
    const song = await SongModel.getSongById(songId);

    if (!song) {
      return res.status(404).json({ message: "Song not found" });
    }

    res.json({
      message: "Song retrieved successfully",
      data: song,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSong = async (req, res) => {
  try {
    const { songId } = req.params;
    const { title, lyrics, duration, releasedate, is_explicit, artistIds, albumIds, genreIds } = req.body;
    const file_song = req.file; // Tệp âm thanh
    const image = req.file; // Tệp hình ảnh
    let artistIdsArray = Array.isArray(artistIds) ? artistIds : (typeof artistIds === 'string' ? artistIds.split(',') : []);
    let albumIdsArray = Array.isArray(albumIds) ? albumIds : (typeof albumIds === 'string' ? albumIds.split(',') : []);
    let genreIdsArray = Array.isArray(genreIds) ? genreIds : (typeof genreIds === 'string' ? genreIds.split(',') : []);

    const updatedSong = await SongModel.updateSong(songId, {
      title,
      lyrics,
      duration,
      releasedate,
      is_explicit: is_explicit === 'true',
      artistIds: artistIdsArray,
      albumIds: albumIdsArray,
      genreIds: genreIdsArray,
      file_song: file_song ? file_song.path : null, // Đường dẫn file âm thanh
      image: image ? image.path : null, // Đường dẫn hình ảnh
      updatedAt: new Date(),
    });

    res.json({
      message: "Song updated successfully",
      data: updatedSong,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSong = async (req, res) => {
  const { title, lyrics, duration, releasedate, is_explicit, artistIds, albumIds, genreIds } = req.body;

  // Kiểm tra file
  const file_song = req.files['file_song'] ? req.files['file_song'][0] : null;
  const image = req.files['image'] ? req.files['image'][0] : null;

  // Chuyển đổi genreIds từ chuỗi JSON thành đối tượng JSON nếu cần
  let genreData;
  let artistData;
  let albumData;
  try {
    genreData = typeof genreIds === 'string' ? JSON.parse(genreIds) : genreIds;
    albumData = typeof albumIds === 'string' ? JSON.parse(albumIds) : albumIds;
    artistData = typeof artistIds === 'string' ? JSON.parse(artistIds) : artistIds;
  } catch (error) {
    return res.status(400).json({ message: "Invalid format for genreIds" });
  }

  // Kiểm tra các trường bắt buộc
  if (!title || !file_song || !image) {
    return res.status(400).json({ message: "file_song, and image are required" });
  }

  try {
    // Gọi model để tạo bài hát mới với các tham số riêng biệt
    const newSong = await SongModel.createSong(
      title,
      lyrics,
      duration,
      releasedate,
      is_explicit === 'true', // Chuyển đổi thành boolean
      file_song, // Sử dụng đường dẫn tệp
      image,     // Sử dụng đường dẫn tệp
      artistData,
      albumData,
      genreData // Truyền đối tượng genreData thay vì chuỗi JSON
    );

    res.status(200).json({
      message: "Song created successfully",
      data: newSong,
    });
  } catch (error) {
    console.error("Error creating song:", error); // In chi tiết lỗi
    res.status(500).json({ message: error.message });
  }
};



const deleteSong = async (req, res) => {
  try {
    const { songId } = req.params;
    await SongModel.deleteSong(songId);
    res.json({
      message: "Song deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


module.exports = { getAllSongs, getSongById, updateSong, createSong, deleteSong };
