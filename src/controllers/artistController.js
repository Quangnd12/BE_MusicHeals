const ArtistModel = require('../models/artistModel');
const {uploadToStorage}=require("../middlewares/uploadMiddleware");

const getAllArtists = async (req, res) => {
  const page = parseInt(req.query.page) || 1;  // Mặc định là 1 nếu không có giá trị
  const limit = 4;  // Đặt limit là 15 cho mỗi trang

  if (page < 1) {
    return res.status(400).json({ message: 'Page must be greater than 0.' });
  }

  try {
    const artists = await ArtistModel.getAllArtist(page, limit);
    const totalCount = await ArtistModel.getArtistCount();
    const totalPages = Math.ceil(totalCount / limit);
    
    return res.status(200).json({
      artists,
      totalPages,
      totalCount,  // Tổng số dòng dữ liệu trong bảng
      currentPage: page,  // Trang hiện tại
      limitPerPage: limit  // Số dòng dữ liệu trên mỗi trang (15)
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

    // Tạo nghệ sĩ trong database
    const artistId = await ArtistModel.createArtist(newArtist);
    
    res.status(200).json({ id: artistId, ...newArtist });

  } catch (error) {
    console.error('Error creating artist:', error);
    if (error.message === 'Artist with this name already exists') {
      return res.status(400).json({ message: error.message });
    }
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

    // Delete the artist from the database
    await ArtistModel.deleteArtist(id);
    res.json({ message: 'Artist deleted successfully' });
  } catch (error) {
    console.error('Error deleting artist:', error);
    res.status(500).json({ message: 'Error deleting artist', error: error.message });
  }
};



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


module.exports = { getAllArtists, getArtistById, createArtist, updateArtist, deleteArtist, searchArtists };
