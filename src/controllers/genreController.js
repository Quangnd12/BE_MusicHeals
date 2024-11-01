const GenreModel = require('../models/genreModel');

// Lấy tất cả các thể loại
const getAllGenres = async (req, res) => {
  const page = parseInt(req.query.page) || 1; 
  const limit = parseInt(req.query.limit) || 10; 

  if (page < 1 || limit < 1) {
    return res.status(400).json({ message: 'Page and limit must be greater than 0.' });
  }

  try {
    const genres = await GenreModel.getAllGenres(page, limit);
    const totalCount = await GenreModel.getGenreCount(); 
    const totalPages = Math.ceil(totalCount / limit); 
    res.json({genres, totalPages });
  } catch (error) {
    console.error(error); 
    res.status(500).json({ message: 'Error retrieving genres', error: error.message });
  }
};

// Lấy thể loại theo ID
const getGenreById = async (req, res) => {
  try {
    const { id } = req.params;
    const genre = await GenreModel.getGenreById(id);

    if (!genre) {
      return res.status(404).json({ message: 'Genre not found' });
    }

    res.json(genre);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving genre', error: error.message });
  }
};

// Tạo thể loại mới
const createGenre = async (req, res) => {
  try {
    const { countryID, name } = req.body;
    if (!name || !countryID) {
      return res.status(400).json({ message: 'Name and countryID are required' });
    }

    const newGenre = { countryID, name };

    const genreId = await GenreModel.createGenre(newGenre);
    res.status(200).json({ id: genreId, ...newGenre }); 

  } catch (error) {
    console.error('Error creating genre:', error);
    if (error.message === 'Genre with this name already exists') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error creating genre', error: error.message });
  }
};

// Cập nhật thể loại
const updateGenre = async (req, res) => {
  try {
    const { id } = req.params;
    const existingGenre = await GenreModel.getGenreById(id);

    if (!existingGenre) {
      return res.status(404).json({ message: 'Genre not found' });
    }

    const updatedGenre = {
      countryID: req.body.countryID || existingGenre.countryID,
      name: req.body.name || existingGenre.name,
    };

    await GenreModel.updateGenre(id, updatedGenre);
    res.status(200).json({ message: "Genre updated successfully", genre: updatedGenre });

  } catch (error) {
    console.error("Error updating genre:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Xóa thể loại theo ID
const deleteGenre = async (req, res) => {
  try {
    const { id } = req.params;

    const existingGenre = await GenreModel.getGenreById(id);
    if (!existingGenre) {
      return res.status(404).json({ message: 'Genre not found' });
    }

    await GenreModel.deleteGenre(id);
    res.json({ message: 'Genre deleted successfully' });
  } catch (error) {
    console.error('Error deleting genre:', error);
    res.status(500).json({ message: 'Error deleting genre', error: error.message });
  }
};

module.exports = { getAllGenres, getGenreById, createGenre, updateGenre, deleteGenre };
