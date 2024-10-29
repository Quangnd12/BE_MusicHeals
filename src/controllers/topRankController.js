const TopRankModel = require("../models/topRankModel");

// Lấy danh sách tất cả TopRanks
const getAllTopRanks = async (req, res) => {
  try {
    const { page = 1, limit = 5, searchTerm = "" } = req.query;
    const topRanks = await TopRankModel.getAllTopRanks(Number(page), Number(limit), searchTerm);
    res.json({
      message: "TopRanks retrieved successfully",
      data: topRanks,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy TopRank theo ID
const getTopRankById = async (req, res) => {
  try {
    const { rankId } = req.params;
    const topRank = await TopRankModel.findById(rankId);

    if (!topRank) {
      return res.status(404).json({ message: "TopRank not found" });
    }

    res.json({
      message: "TopRank retrieved successfully",
      data: topRank,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Tạo mới TopRank
const createTopRank = async (req, res) => {
  const { rank, artistId, albumId, songId } = req.body;

  if (!rank || !artistId || !albumId || !songId) {
    return res.status(400).json({ message: "Rank, artistId, albumId, and songId are required" });
  }

  try {
    const newTopRank = await TopRankModel.create({ rank, artistId, albumId, songId });
    res.status(201).json({
      message: "TopRank created successfully",
      data: newTopRank,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cập nhật TopRank theo ID
const updateTopRank = async (req, res) => {
  try {
    const { rankId } = req.params;
    const { rank, artistId, albumId, songId } = req.body;

    if (!rank && !artistId && !albumId && !songId) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const updatedTopRank = await TopRankModel.update(rankId, {
      rank,
      artistId,
      albumId,
      songId,
    });

    if (!updatedTopRank) {
      return res.status(404).json({ message: "TopRank not found" });
    }

    res.json({
      message: "TopRank updated successfully",
      data: updatedTopRank,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Xóa TopRank theo ID
const deleteTopRank = async (req, res) => {
  try {
    const { rankId } = req.params;
    await TopRankModel.delete(rankId);
    res.json({
      message: "TopRank deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllTopRanks, getTopRankById, createTopRank, updateTopRank, deleteTopRank };
