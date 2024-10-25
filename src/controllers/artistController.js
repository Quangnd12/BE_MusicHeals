const Artist = require("../models/artistModel");

exports.createArtist = async (req, res) => {
  try {
    const { name, bio, monthly_listeners, albumId, songId, followerId } = req.body;

    let avatarUrl = null;
    if (req.file) {
      avatarUrl = await Artist.uploadAvatar(req.file);
    }

     // Xử lý dữ liệu cho các trường mảng
     const processedAlbumId = albumId ? (
      Array.isArray(albumId) 
        ? albumId 
        : albumId.split(',').map(id => id.trim())
    ) : [];

    const processedSongId = songId ? (
      Array.isArray(songId)
        ? songId
        : songId.split(',').map(id => id.trim())
    ) : [];

    const processedFollowerId = followerId ? (
      Array.isArray(followerId)
        ? followerId
        : followerId.split(',').map(id => id.trim())
    ) : [];

    const artistData = {
      name,
      bio,
      avatar: avatarUrl,
      albumId: processedAlbumId,
      songId: processedSongId,
      followerId: processedFollowerId,
      monthly_listeners: parseInt(monthly_listeners, 10) || 0,
    };

    const artistId = await Artist.create(artistData);
    const createdArtist = await Artist.findById(artistId);

    res.status(201).json({
      artist: createdArtist,
      message: "Tạo nghệ sĩ thành công",
      artistId,
    });
  } catch (error) {
    console.error("Error creating artist:", error);
    res.status(500).json({
      message: "Có lỗi xảy ra khi tạo nghệ sĩ",
      error: error.message,
    });
  }
};

exports.getArtistById = async (req, res) => {
  try {
    const { artistId } = req.params;
    const artist = await Artist.findById(artistId);
    if (!artist) {
      return res.status(404).json({ message: "Nghệ sĩ không tồn tại" });
    }
    res.status(200).json(artist);
  } catch (error) {
    res.status(500).json({ message: "Có lỗi xảy ra", error: error.message });
  }
};

exports.updateArtist = async (req, res) => {
  try {
    const { artistId } = req.params;
    const updateData = { ...req.body };

    // Xử lý các trường dạng mảng
    ["albumId", "songId", "followerId"].forEach((field) => {
      if (updateData[field]) {
        updateData[field] = Array.isArray(updateData[field])
          ? updateData[field]
          : updateData[field].split(',').map(id => id.trim());
      }
    });

    // Nếu có file avatar mới, upload avatar lên Firebase Storage
    if (req.file) {
      const avatarUrl = await Artist.uploadAvatar(req.file);
      updateData.avatar = avatarUrl;
    }

    updateData.updatedAt = new Date();

    const updatedArtist = await Artist.update(artistId, updateData);
    if (!updatedArtist) {
      return res.status(404).json({ message: "Không tìm thấy nghệ sĩ" });
    }

    res.status(200).json({
      message: "Cập nhật nghệ sĩ thành công",
      artist: updatedArtist,
    });
  } catch (error) {
    console.error("Error updating artist:", error);
    res.status(500).json({
      message: "Có lỗi xảy ra khi cập nhật nghệ sĩ",
      error: error.message,
    });
  }
};

exports.deleteArtist = async (req, res) => {
  try {
    const { artistId } = req.params;
    await Artist.delete(artistId);
    res.status(200).json({ message: "Xóa nghệ sĩ thành công" });
  } catch (error) {
    res.status(500).json({ message: "Có lỗi xảy ra", error: error.message });
  }
};

exports.getAllArtists = async (req, res) => {
  try {
    const { page = 1, limit = 5, searchTerm = "" } = req.query;

    const result = await Artist.getAllArtists(
      parseInt(page),
      parseInt(limit),
      searchTerm
    );

    res.status(200).json({
      total: result.totalArtists,
      currentPage: parseInt(page),
      totalPages: result.totalPages,
      artists: result.artists,
    });
  } catch (error) {
    res.status(500).json({ message: "Có lỗi xảy ra", error: error.message });
  }
};