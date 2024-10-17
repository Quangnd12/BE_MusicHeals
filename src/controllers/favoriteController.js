const FavoriteModel = require("../models/favoriteModel");

const getAllFavorites = async (req, res) => {
  try {
    const favorites = await FavoriteModel.getUserFavorites();
    res.json({
      message: "Favorites retrieved successfully",
      data: favorites,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFavoriteById = async (req, res) => {
  try {
    const { favoriteId } = req.params;
    const favorite = await FavoriteModel.getFavoriteById(favoriteId);

    if (!favorite) {
      return res.status(404).json({ message: "Favorite not found" });
    }

    res.json({
      message: "Favorite retrieved successfully",
      data: favorite,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const createFavorite = async (req, res) => {
    const { userId, songId, albumId, playlistId } = req.body;
    if (!userId || (!songId && !albumId && !playlistId)) {
      return res.status(400).json({ message: "UserId and at least one of songId, albumId, playlistId are required" });
    }
  
    try {
      const newFavorite = await FavoriteModel.createFavorite(userId, songId, albumId, playlistId);
  
      res.status(201).json({
        message: "Favorite created successfully",
        data: newFavorite,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
const deleteFavorite = async (req, res) => {
    try {
      const { favoriteId } = req.params;
      await FavoriteModel.deleteFavorite(favoriteId);
      res.json({
        message: "Favorite deleted successfully",
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  

module.exports = { getAllFavorites, getFavoriteById, createFavorite, deleteFavorite };
