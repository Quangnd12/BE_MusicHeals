const AlbumModel = require('../models/albumModel'); 
const { uploadToStorage } = require("../middlewares/uploadMiddleware");

const getAllAlbums = async (req, res) => {
  const page = parseInt(req.query.page) || 1; 
  const limit = parseInt(req.query.limit) || 10; 

  if (page < 1 || limit < 1) {
    return res.status(400).json({ message: 'Page and limit must be greater than 0.' });
  }

  try {
    const albums = await AlbumModel.getAllAlbums(page, limit);
    const totalCount = await AlbumModel.getAlbumCount(); 
    const totalPages = Math.ceil(totalCount / limit); 
    res.json({albums, totalPages });
  } catch (error) {
    console.error(error); 
    res.status(500).json({ message: 'Error retrieving albums', error: error.message });
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

const createAlbum = async (req, res) => {
  try {
    const { title, artistID, releaseDate } = req.body;
    if (!title || !artistID || !releaseDate) {
      return res.status(400).json({ message: 'Title, artistID, and releaseDate are required' });
    }

    const newAlbum = { title, artistID, releaseDate };

    if (req.file) {
      const imageFile = req.file; 
      const imagePublicUrl = await uploadToStorage(imageFile, 'albums/images');
      newAlbum.image = imagePublicUrl; 
    }

    const albumId = await AlbumModel.createAlbum(newAlbum);
    res.status(200).json({ id: albumId, ...newAlbum });

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

    const updatedAlbum = {
      title: req.body.title || existingAlbum.title,
      image: existingAlbum.image, 
      artistID: req.body.artistID || existingAlbum.artistID,
      releaseDate: req.body.releaseDate || existingAlbum.releaseDate,
    };

    if (req.file) {
      const imageFile = req.file; 
      const imagePublicUrl = await uploadToStorage(imageFile, 'albums/images');
      updatedAlbum.image = imagePublicUrl; 
    }

    await AlbumModel.updateAlbum(id, updatedAlbum);
    res.status(200).json({ message: "Album updated successfully", album: updatedAlbum });
    
  } catch (error) {
    console.error("Error updating album:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Xóa album theo ID
const deleteAlbum = async (req, res) => {
  try {
    const { id } = req.params;

    const existingAlbum = await AlbumModel.getAlbumById(id);
    if (!existingAlbum) {
      return res.status(404).json({ message: 'Album not found' });
    }

    if (existingAlbum.image && existingAlbum.image.includes("firebase")) {
      const oldImagePath = existingAlbum.image.split("/o/")[1].split("?")[0];
      try {
        await bucket.file(decodeURIComponent(oldImagePath)).delete();
      } catch (error) {
        console.error("Error deleting old image:", error);
      }
    }

    await AlbumModel.deleteAlbum(id);
    res.json({ message: 'Album deleted successfully' });
  } catch (error) {
    console.error('Error deleting album:', error);
    res.status(500).json({ message: 'Error deleting album', error: error.message });
  }
};

module.exports = { getAllAlbums, getAlbumById, createAlbum, updateAlbum, deleteAlbum };
