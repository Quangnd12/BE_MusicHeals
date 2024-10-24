const Album = require("../models/albumModel");

// Create a new album
exports.createAlbum = async (req, res) => {
  try {
    const {
      title,
      artistId,
      songId,
      describe,
      totalTracks,
      popularity,
      releaseDate,
    } = req.body;

    // Upload ảnh album nếu có
    let imageUrl = null;
    if (req.file) {
      imageUrl = await Album.uploadImage(req.file);
    }

    // Xử lý artistId và songId
    const processedArtistId = artistId ? (
      Array.isArray(artistId) 
        ? artistId 
        : artistId.split(',').map(id => id.trim())
    ) : [];

    const processedSongId = songId ? (
      Array.isArray(songId)
        ? songId
        : songId.split(',').map(id => id.trim())
    ) : [];

    // Chuẩn bị dữ liệu album cho Firestore
    const albumData = {
      title,
      artistId: processedArtistId,
      songId: processedSongId,
      describe,
      totalTracks: parseInt(totalTracks, 10) || 0,
      popularity: parseInt(popularity, 10) || 0,
      releaseDate: new Date(releaseDate),
      image: imageUrl,
    };

    const albumId = await Album.create(albumData);
    const createdAlbum = await Album.findById(albumId);

    res.status(201).json({
      album: createdAlbum,
      message: "Tạo album thành công",
      albumId,
    });
  } catch (error) {
    console.error("Error creating album:", error);
    res.status(500).json({
      message: "Đã xảy ra lỗi khi tạo album",
      error: error.message,
    });
  }
};

// Get album by ID
exports.getAlbumById = async (req, res) => {
  try {
    const { albumId } = req.params;
    const album = await Album.findById(albumId);
    if (!album) {
      return res.status(404).json({ message: "Album không tồn tại" });
    }
    res.status(200).json(album);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Đã xảy ra lỗi", error: error.message });
  }
};

// Update album
exports.updateAlbum = async (req, res) => {
  try {
    const { albumId } = req.params;
    const updateData = { ...req.body };

    // Handle numeric fields
    if (updateData.totalTracks)
      updateData.totalTracks = parseInt(updateData.totalTracks, 10);
    if (updateData.popularity)
      updateData.popularity = parseInt(updateData.popularity, 10);

    // Handle date field
    if (updateData.releaseDate)
      updateData.releaseDate = new Date(updateData.releaseDate);

    // Xử lý các trường dạng mảng
    ["songId, artistId"].forEach((field) => {
      if (updateData[field]) {
        updateData[field] = Array.isArray(updateData[field])
          ? updateData[field]
          : [updateData[field]];
      }
    });

    // Upload new image if provided
    if (req.file) {
      const imageUrl = await Album.uploadImage(req.file);
      updateData.image = imageUrl;
    }

    updateData.updatedAt = new Date();

    const updatedAlbum = await Album.update(albumId, updateData);
    if(!updateData) {
      return res.status(404).json({message: "Không tìm thấy album"})
    }
    res
      .status(200)
      .json({ message: "Cập nhật Album thành công", album: updatedAlbum });
  } catch (error) {
    console.error("Error updating album:", error);
    res.status(500).json({
      message: "Có lỗi xảy ra khi cập nhật album",
      error: error.message,
    });
  }
};

// Delete album
exports.deleteAlbum = async (req, res) => {
  try {
    const { albumId } = req.params;
    await Album.delete(albumId);
    res.status(200).json({ message: "Album deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
};

// Get all albums
exports.getAllAlbums = async (req, res) => {
  try {
    const { page = 1, limit = 5, searchTerm = "" } = req.query;

    const result = await Album.getAllAlbums(
      parseInt(page),
      parseInt(limit),
      searchTerm
    );

    if (!result || !result.albums) {
      throw new Error("Invalid result from AlbumModel.getAllAlbums");
    }

    res.status(200).json({
      total: result.totalAlbums,
      currentPage: parseInt(page),
      totalPages: result.totalPages,
      albums: result.albums,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Có lỗi xảy ra", error: error.message });
  }
};
