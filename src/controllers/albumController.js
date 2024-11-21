// albumController.js
const AlbumModel = require('../models/albumModel');
const { uploadToStorage } = require("../middlewares/uploadMiddleware");

const getAllAlbums = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const searchTitle = req.query.searchTitle || '';

  if (page < 1 || limit < 1) {
    return res.status(400).json({ message: 'Page and limit must be greater than 0.' });
  }

  try {
    let albums;
    if (!req.query.page || !req.query.limit) {
      // If no pagination parameters, return all albums
      albums = await AlbumModel.getAllAlbums(false, null, null, searchTitle);
      return res.status(200).json({ albums });
    }

    // Get paginated albums
    albums = await AlbumModel.getAllAlbums(true, page, limit, searchTitle);

    // Get total count for pagination
    const totalCount = await AlbumModel.getAlbumCount(searchTitle);
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      albums,
      totalPages,
      totalCount,
      limit,
      currentPage: page
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error retrieving albums', error: error.message });
  }
};
const getAlbumById = async (req, res) => {
  try {
    const { id } = req.params;
    const album = await AlbumModel.getAlbumById(id);

    if (!album) {
      return res.status(404).json({ message: 'Album not found' });
    }

    res.json(album);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving album', error: error.message });
  }
};

const validateReleaseDate = (releaseDate) => {
  // Lấy ngày hiện tại ở múi giờ Việt Nam (UTC+7)
  const now = new Date();
  const vietnamTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  vietnamTime.setHours(0, 0, 0, 0);
  const todayVietnam = vietnamTime.toISOString().split('T')[0];

  // Xử lý releaseDate
  let releaseDateStr;
  try {
    if (typeof releaseDate === 'string' && releaseDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Nếu là string YYYY-MM-DD, chuyển sang Date object để xử lý múi giờ
      const dateObj = new Date(releaseDate);
      const dateVN = new Date(dateObj.getTime() + (7 * 60 * 60 * 1000));
      releaseDateStr = dateVN.toISOString().split('T')[0];
    } else {
      // Nếu là định dạng khác
      const releaseDateObj = new Date(releaseDate);
      if (isNaN(releaseDateObj.getTime())) {
        throw new Error('Invalid date');
      }
      const dateVN = new Date(releaseDateObj.getTime() + (7 * 60 * 60 * 1000));
      releaseDateStr = dateVN.toISOString().split('T')[0];
    }
  } catch (error) {
    throw new Error('Invalid release date format. Please use YYYY-MM-DD format.');
  }

  // So sánh với ngày hiện tại ở múi giờ Việt Nam
  if (releaseDateStr < todayVietnam) {
    throw new Error('Release date cannot be in the past');
  }

  return releaseDateStr;
};

const createAlbum = async (req, res) => {
  try {
    const { title, artistID, releaseDate } = req.body;
    
    // Validate required fields
    if (!title || !artistID || !releaseDate) {
      return res.status(400).json({ 
        message: 'Title, artistID, and releaseDate are required',
        details: {
          title: title ? null : 'Title is required',
          artistID: artistID ? null : 'Artist ID is required',
          releaseDate: releaseDate ? null : 'Release date is required'
        }
      });
    }

    // Validate release date
    try {
      const validatedReleaseDate = validateReleaseDate(releaseDate);
      const newAlbum = { 
        title, 
        artistID, 
        releaseDate: validatedReleaseDate
      };

      if (req.file) {
        const imageFile = req.file;
        const imagePublicUrl = await uploadToStorage(imageFile, 'albums/images');
        newAlbum.image = imagePublicUrl;
      }

      const albumId = await AlbumModel.createAlbum(newAlbum);
      res.status(201).json({ 
        message: 'Album created successfully',
        album: { id: albumId, ...newAlbum }
      });
    } catch (dateError) {
      return res.status(400).json({ 
        message: 'Invalid release date',
        error: dateError.message 
      });
    }

  } catch (error) {
    console.error('Error creating album:', error);
    if (error.message === 'Album with this title already exists for this artist') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error creating album', error: error.message });
  }
};

const updateAlbum = async (req, res) => {
  try {
    const { id } = req.params;
    const existingAlbum = await AlbumModel.getAlbumById(id);

    if (!existingAlbum) {
      return res.status(404).json({ message: 'Album not found' });
    }

    // Validate release date if it's being updated
    let validatedReleaseDate = existingAlbum.releaseDate;
    if (req.body.releaseDate) {
      try {
        validatedReleaseDate = validateReleaseDate(req.body.releaseDate);
      } catch (dateError) {
        return res.status(400).json({ 
          message: 'Invalid release date',
          error: dateError.message 
        });
      }
    }

    const updatedAlbum = {
      title: req.body.title || existingAlbum.title,
      image: existingAlbum.image,
      artistID: req.body.artistID || existingAlbum.artistID,
      releaseDate: validatedReleaseDate,
    };

    if (req.file) {
      const imageFile = req.file;
      const imagePublicUrl = await uploadToStorage(imageFile, 'albums/images');
      updatedAlbum.image = imagePublicUrl;
    }

    await AlbumModel.updateAlbum(id, updatedAlbum);
    res.status(200).json({ 
      message: "Album updated successfully", 
      album: updatedAlbum 
    });

  } catch (error) {
    console.error("Error updating album:", error);
    if (error.message === 'An album with this title already exists for this artist') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
const deleteAlbum = async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra album tồn tại
    const existingAlbum = await AlbumModel.getAlbumById(id);
    if (!existingAlbum) {
      return res.status(404).json({ message: 'Album not found' });
    }

    // Kiểm tra xem album có hình ảnh hay không và nếu có thì tiến hành xóa
    if (existingAlbum.coverImage) {
      // Tạo đường dẫn tệp từ URL
      const oldImagePath = existingAlbum.coverImage.replace('https://storage.googleapis.com/', '').replace('be-musicheals-a6d7a.appspot.com/', '');
      try {
        // Xóa hình ảnh từ Firebase Storage
        await bucket.file(oldImagePath).delete();
        console.log("Album cover image deleted successfully.");
      } catch (error) {
        console.error("Error deleting album cover image:", error);
        return res.status(500).json({ message: 'Error deleting album cover image', error: error.message });
      }
    }

    // Xóa album khỏi cơ sở dữ liệu
    await AlbumModel.deleteAlbum(id);
    res.json({ message: 'Album deleted successfully' });
  } catch (error) {
    console.error('Error deleting album:', error);
    res.status(500).json({ message: 'Error deleting album', error: error.message });
  }
};



const searchAlbums = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: 'Search term is required' });
    }
    const albums = await AlbumModel.searchAlbumsByTitle(q);
    res.json(albums);
  } catch (error) {
    res.status(500).json({ message: 'Error searching albums', error: error.message });
  }
};


const getThisMonthAlbums = async (req, res) => {
  try {
    const albums = await AlbumModel.getThisMonthAlbums();
    res.json(albums);
  } catch (error) {
    res.status(500).json({ message: 'Error getting this month albums', error: error.message });
  }
};


module.exports = {
  getAllAlbums,
  getAlbumById,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  searchAlbums,
  getThisMonthAlbums,
  validateReleaseDate
};