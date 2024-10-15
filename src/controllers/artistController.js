const Artist = require("../models/artistModel");

// Tạo mới nghệ sĩ
exports.createArtist = async (req, res) => {
  try {
    const { name, bio, genre, albums, songs, followers } = req.body;
    const artistData = {
      name,
      bio,
      genre,
      albums: albums || [],
      songs: songs || [],
      followers: followers || [],
      monthly_listeners: 0 // Khởi tạo số lượng người nghe hàng tháng = 0
    };
    const artistId = await Artist.create(artistData);
    res.status(201).json({ message: "Tạo nghệ sĩ thành công", artistId });
  } catch (error) {
    res.status(500).json({ message: "Có lỗi xảy ra", error: error.message });
  }
};

// Lấy thông tin nghệ sĩ theo ID
exports.getArtistById = async (req, res) => {
  try {
    const { artistId } = req.params;
    const artist = await Artist.findById(artistId);
    res.status(200).json(artist);
  } catch (error) {
    res.status(404).json({ message: "Nghệ sĩ không tồn tại", error: error.message });
  }
};

// Cập nhật thông tin nghệ sĩ
exports.updateArtist = async (req, res) => {
  try {
    const { artistId } = req.params;
    const updateData = req.body;
    const updatedArtist = await Artist.update(artistId, updateData);
    res.status(200).json({ message: "Cập nhật nghệ sĩ thành công", updatedArtist });
  } catch (error) {
    res.status(500).json({ message: "Có lỗi xảy ra", error: error.message });
  }
};

// Xóa nghệ sĩ
exports.deleteArtist = async (req, res) => {
  try {
    const { artistId } = req.params;
    await Artist.delete(artistId);
    res.status(200).json({ message: "Xóa nghệ sĩ thành công" });
  } catch (error) {
    res.status(500).json({ message: "Có lỗi xảy ra", error: error.message });
  }
};

// Lấy danh sách tất cả nghệ sĩ
exports.getAllArtists = async (req, res) => {
  try {
    const artists = await Artist.getAll();
    res.status(200).json(artists);
  } catch (error) {
    res.status(500).json({ message: "Có lỗi xảy ra", error: error.message });
  }
};
