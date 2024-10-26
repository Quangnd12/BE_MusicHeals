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
    const { name, description, subgenres } = req.body;
    const image=req.file;
    let subgenresArray = Array.isArray(subgenres) ? subgenres : (typeof subgenres === 'string' ? subgenres.split(',') : []);

    const updatedGenre = await GenreModel.updateGenre(genreId, name, description, image, subgenresArray);

    res.json({
      message: "Genre updated successfully",
      data: updatedGenre,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createGenre = async (req, res) => {
  const { name, description, subgenres } = req.body;
  const image = req.file;
  let subgenresArray = Array.isArray(subgenres) ? subgenres : subgenres.split(',');
  // Kiểm tra các trường bắt buộc
  if (!name || !description || !image) {
    return res.status(400).json({ message: "Name and description are required" });
  }

  try {
    // Chỉ cần truyền subgenres vào model mà không cần xử lý thêm
    const newGenre = await GenreModel.createGenre(name, description, image, subgenresArray || []);

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

const deleteGenreAll = async (req, res) => {
  const { genreIds } = req.params;  // Nhận danh sách genreIds từ request body

  if (!Array.isArray(genreIds) || genreIds.length === 0) {
    return res.status(400).json({ message: 'Invalid or empty id array' });
  }

  try {
    console.log(`Attempting to delete genres with IDs: ${genreIds.join(', ')}`);  // Log danh sách genreIds

    const deletedCount = await GenreModel.deleteGenresAll(genreIds);  // Xóa thể loại theo danh sách ID

    if (deletedCount === 0) {
      return res.status(404).json({ message: 'No genres found with the given IDs' });
    }

    res.status(200).json({ message: 'Genres deleted successfully', deletedCount });
  } catch (error) {
    console.error('Error deleting genres:', error);
    res.status(500).json({ message: 'Failed to delete genres' });
  }
};




module.exports = { getAllGenres, getGenreById, updateGenre, createGenre, deleteGenre, deleteGenreAll };
