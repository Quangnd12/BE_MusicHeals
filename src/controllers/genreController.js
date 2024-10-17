const GenreModel = require("../models/genreModel");

const getAllGenres = async (req, res) => {
  try {
    const genres = await GenreModel.getAllGenres();
    res.json({
      message: "Genres retrieved successfully",
      data: genres,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getGenreById = async (req, res) => {
  try {
    const { genreId } = req.params;
    const genre = await GenreModel.getGenreById(genreId);

    if (!genre) {
      return res.status(404).json({ message: "Genre not found" });
    }

    res.json({
      message: "Genre retrieved successfully",
      data: genre,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateGenre = async (req, res) => {
  try {
    const { genreId } = req.params;
    const { name, description,image, subgenres } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!name || !description || !image) {
      return res.status(400).json({ message: "Name and description are required" });
    }

    // Cập nhật genre với subgenres (nếu có)
    const updatedGenre = await GenreModel.updateGenre(genreId, {
      name,
      description,
      image,
      subgenres: subgenres || []  // Nếu không có subgenres thì mặc định là mảng rỗng
    });

    res.json({
      message: "Genre updated successfully",
      data: updatedGenre,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createGenre = async (req, res) => {
  const { name, description,image, subgenres } = req.body;

  // Kiểm tra các trường bắt buộc
  if (!name || !description || !image) {
    return res.status(400).json({ message: "Name and description are required" });
  }

  try {
    // Chỉ cần truyền subgenres vào model mà không cần xử lý thêm
    const newGenre = await GenreModel.createGenre(name, description,image, subgenres || []);
    
    res.status(201).json({
      message: "Genre created successfully",
      data: newGenre,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteGenre = async (req, res) => {
  try {
    const { genreId } = req.params;
    await GenreModel.deleteGenre(genreId);
    res.json({
      message: "Genre deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllGenres, getGenreById, updateGenre, createGenre, deleteGenre };
