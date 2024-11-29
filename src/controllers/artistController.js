const ArtistModel = require('../models/artistModel');
const { uploadToStorage } = require("../middlewares/uploadMiddleware");

const getAllArtists = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  if ((page && page < 1) || (limit && limit < 1)) {
    return res.status(400).json({ message: 'Page and limit must be greater than 0.' });
  }

  try {
    let artists;

    if (!page || !limit) {
      artists = await ArtistModel.getAllArtist();
      return res.status(200).json({ artists });
    }

    artists = await ArtistModel.getAllArtist(page, limit);
    const totalCount = await ArtistModel.getArtistCount();
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      artists,
      totalPages,
      totalCount,
      currentPage: page,
      limitPerPage: limit,
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

    if (!name || !role) {
      return res.status(400).json({ message: 'Name and role are required' });
    }

    const newArtist = { name, role, biography };

    if (req.file) {
      const avatarFile = req.file;
      const imagePublicUrl = await uploadToStorage(avatarFile, 'artists/images');
      newArtist.avatar = imagePublicUrl;
    }

    const artistExists = await ArtistModel.checkArtistExistsByName(name);
    if (artistExists) {
      return res.status(400).json({ message: 'Artist with this name already exists' });
    }

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

const deleteArtist = async (req, res) => {
  try {
    const { id } = req.params;

    const existingArtist = await ArtistModel.getArtistById(id);
    if (!existingArtist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    if (existingArtist.avatar && existingArtist.avatar.includes("firebase")) {
      const oldImagePath = existingArtist.avatar.split("/o/")[1].split("?")[0];
      try {
        await bucket.file(decodeURIComponent(oldImagePath)).delete();
      } catch (error) {
        console.error("Error deleting old image:", error);
      }
    }

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
      return res.status(400).json({ message: 'Artist name is required for search.' });
    }

    const artists = await ArtistModel.searchArtistsByName(name);
    res.json({
      artists,
      totalPages: 1,
      totalCount: artists.length,
      currentPage: 1,
      limitPerPage: artists.length,
    });
  } catch (error) {
    console.error('Error searching artists:', error);
    res.status(500).json({ message: 'Error searching artists.', error: error.message });
  }
};

module.exports = { getAllArtists, getArtistById, createArtist, updateArtist, deleteArtist, searchArtists };
