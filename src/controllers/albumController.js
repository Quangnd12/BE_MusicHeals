const AlbumModel = require("../models/albumModel");

const getAllAlbums = async (req, res) => {
  try {
    const albums = await AlbumModel.getAllAlbums();
    res.json({
      message: "Albums retrieved successfully",
      data: albums,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAlbumById = async (req, res) => {
  try {
    const { albumId } = req.params;
    const album = await AlbumModel.getAlbumById(albumId);

    if (!album) {
      return res.status(404).json({ message: "Album not found" });
    }

    res.json({
      message: "Album retrieved successfully",
      data: album,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAlbum = async (req, res) => {
  try {
    const { albumId } = req.params;
    const { title, image, artistId, songId, describe, genreId, totalTracks, popularity, releaseDate } = req.body;

    // Validate required fields
    if (!title || !image || !artistId || !songId || !describe || !genreId || !totalTracks || !popularity || !releaseDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Update the album
    const updatedAlbum = await AlbumModel.updateAlbum(albumId, {
      title,
      image,
      artistId,
      songId,
      describe,
      genreId,
      totalTracks,
      popularity,
      releaseDate,
    });

    res.json({
      message: "Album updated successfully",
      data: updatedAlbum,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAlbum = async (req, res) => {
  const { title, image, artistId, songId, describe, genreId, totalTracks, popularity, releaseDate } = req.body;

  // Validate required fields
  if (!title || !image || !artistId || !songId || !describe || !genreId || !totalTracks || !popularity || !releaseDate) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Create the album
    const newAlbum = await AlbumModel.createAlbum(
      title,
      image,
      artistId,
      songId,
      describe,
      genreId,
      totalTracks,
      popularity,
      releaseDate
    );

    res.status(201).json({
      message: "Album created successfully",
      data: newAlbum,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAlbum = async (req, res) => {
  try {
    const { albumId } = req.params;
    await AlbumModel.deleteAlbum(albumId);
    res.json({
      message: "Album deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllAlbums, getAlbumById, updateAlbum, createAlbum, deleteAlbum };
