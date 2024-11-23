const ArtistModel = require('../models/artistModel');
const { uploadToStorage } = require("../middlewares/uploadMiddleware");

const getAllArtists = async (req, res) => {
  const page = parseInt(req.query.page) || 1; ; // Không đặt mặc định là 1
  const limit = parseInt(req.query.limit) || 20;  // Không đặt mặc định là 4

  // Nếu có `page` và `limit`, kiểm tra giá trị hợp lệ
  if ((page && page < 1) || (limit && limit < 1)) {
    return res.status(400).json({ message: 'Page and limit must be greater than 0.' });
  }

  try {
    let artists;
    
    // Nếu không có `page` hoặc `limit`, lấy tất cả nghệ sĩ mà không phân trang
    if (!page || !limit) {
      artists = await ArtistModel.getAllArtist();  // Gọi hàm mà không truyền `page` và `limit`
      return res.status(200).json({ artists });
    }

    // Nếu có `page` và `limit`, lấy dữ liệu có phân trang
    artists = await ArtistModel.getAllArtist(page, limit);
    const totalCount = await ArtistModel.getArtistCount();
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      artists,
      totalPages,
      totalCount,    // Tổng số dòng dữ liệu trong bảng
      currentPage: page, // Trang hiện tại
      limitPerPage: limit  // Số dòng dữ liệu trên mỗi trang
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving artists', error: error.message });
  }
};


const getArtistById = async (req, res) => {
  try {
    const { id } = req.params;
    const artist = await ArtistModel.getArtistById(id);

    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    res.json(artist);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving artist', error: error.message });
  }
};


const createArtist = async (req, res) => {
  try {
    const { name, role, biography } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!name || !role) {
      return res.status(400).json({ message: 'Name and role are required' });
    }

    const newArtist = { name, role, biography };

    // Xử lý upload hình ảnh nếu có
    if (req.file) {
      const avatarFile = req.file;
      const imagePublicUrl = await uploadToStorage(avatarFile, 'artists/images');
      newArtist.avatar = imagePublicUrl;
    }

    // Kiểm tra xem tên nghệ sĩ đã tồn tại chưa
    const artistExists = await ArtistModel.checkArtistExistsByName(name);
    if (artistExists) {
      return res.status(400).json({ message: 'Artist with this name already exists' });
    }

    // Tạo nghệ sĩ trong database
    const artistId = await ArtistModel.createArtist(newArtist);

    res.status(200).json({ id: artistId, ...newArtist });

  } catch (error) {
    console.error('Error creating artist:', error);
    res.status(500).json({ message: 'Error creating artist', error: error.message });
  }
};



const updateArtist = async (req, res) => {
  try {
    const { id } = req.params;
    const existingArtist = await ArtistModel.getArtistById(id);

    if (!existingArtist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    const updatedArtist = {
      name: req.body.name || existingArtist.name,
      avatar: existingArtist.avatar,
      role: req.body.role || existingArtist.role,
      biography: req.body.biography || existingArtist.biography,
    };

    if (req.file) {
      const avatarFile = req.file;
      const imagePublicUrl = await uploadToStorage(avatarFile, 'artists/images');
      updatedArtist.avatar = imagePublicUrl;
    }

    await ArtistModel.updateArtist(id, updatedArtist);
    res.status(200).json({ message: "Artist updated successfully", artist: updatedArtist });

  } catch (error) {
    console.error("Error updating artist:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Xóa artist theo ID
const deleteArtist = async (req, res) => {
  try {
    const { id } = req.params;

    // Get artist details by ID
    const existingArtist = await ArtistModel.getArtistById(id);
    if (!existingArtist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    // Check if the artist has an avatar stored in Firebase and delete it
    if (existingArtist.avatar && existingArtist.avatar.includes("firebase")) {
      const oldImagePath = existingArtist.avatar.split("/o/")[1].split("?")[0]; // Extract file path from URL
      try {
        await bucket.file(decodeURIComponent(oldImagePath)).delete(); // Delete the avatar from Firebase Storage
      } catch (error) {
        console.error("Error deleting old image:", error);
      }
    }

    // Mark the artist as deleted (soft delete)
    await ArtistModel.softDeleteArtist(id);
    res.json({ message: 'Artist marked as deleted successfully' });
  } catch (error) {
    console.error('Error deleting artist:', error);
    res.status(500).json({ message: 'Error deleting artist', error: error.message });
  }
};

// Khôi phục
// Controller để khôi phục nghệ sĩ
const restoreArtist = async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra xem nghệ sĩ có tồn tại và đã bị xóa mềm chưa
    const artist = await ArtistModel.getArtistById(id);
    if (!artist) {
      return res.status(404).json({ message: 'Nghệ sĩ không tìm thấy' });
    }

    if (!artist.is_deleted) {
      return res.status(400).json({ message: 'Nghệ sĩ này chưa bị xóa' });
    }

    // Khôi phục nghệ sĩ (cập nhật is_deleted thành FALSE)
    await ArtistModel.restoreArtist(id);
    res.json({ message: 'Nghệ sĩ đã được khôi phục thành công' });

  } catch (error) {
    console.error('Lỗi khi khôi phục nghệ sĩ:', error);
    res.status(500).json({ message: 'Lỗi khi khôi phục nghệ sĩ', error: error.message });
  }
};

// Định nghĩa route để khôi phục nghệ sĩ



const searchArtists = async (req, res) => {
  try {
    const name = req.query.name || '';
    if (!name) {
      return res.status(400).json({ message: 'Tên nghệ sĩ là bắt buộc để tìm kiếm.' });
    }

    const artists = await ArtistModel.searchArtistsByName(name);

    // if (artists.length === 0) {
    //   return res.status(404).json({ message: 'Không tìm thấy nghệ sĩ.' });
    // }

    res.json({
      artists,
      totalPages: 1,
      totalCount: artists.length,
      currentPage: 1,
      limitPerPage: artists.length
    });
  } catch (error) {
    console.error('Error searching artists:', error);
    res.status(500).json({ message: 'Lỗi khi tìm kiếm nghệ sĩ.', error: error.message });
  }
};


module.exports = { getAllArtists, getArtistById, createArtist, updateArtist, deleteArtist, searchArtists, restoreArtist};
