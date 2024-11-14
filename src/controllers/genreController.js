const GenreModel = require('../models/genreModel');
const {uploadToStorage}=require("../middlewares/uploadMiddleware");
const {bucket} =require("../config/firebase");

const getAllGenres = async (req, res) => {

  const page = parseInt(req.query.page) || 1; 
  const limit = parseInt(req.query.limit) || 5;
  let countryIDs;
  const searchName = req.query.searchName || ''; 

  if (req.query.countryIDs) {
    try {
      countryIDs = JSON.parse(req.query.countryIDs);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid countryIDs format' });
    }
  }

  if (page < 1 || limit < 1) {
    return res.status(400).json({ message: 'Page and limit must be greater than 0.' });
  }

  try {

    let genres;
    if (!req.query.page || !req.query.limit) {
      genres = await GenreModel.getAllGenres(false, null, null, countryIDs, searchName);
      return res.status(200).json({ genres });
    }

    genres = await GenreModel.getAllGenres(true, page, limit, countryIDs, searchName);

    let totalCount;
    if (countryIDs && countryIDs.length > 0) {
      totalCount = await GenreModel.getGenreCountByCountry(countryIDs, searchName);
    } else {
      totalCount = await GenreModel.getGenreCount(searchName);
    }
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      genres,
      totalPages,
      totalCount,
      limit,
      currentPage: page
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error retrieving genres', error: error.message });
  }
};




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




const createGenre = async (req, res) => {
  try {
    const { countryID, name } = req.body;
    console.log("Request body:", req.body);
    if (!name || !countryID) {
      return res.status(400).json({ message: 'Name and countryID are required' });
    }

    const newGenre = { countryID, name };
    if (req.file) {
      const imageFile = req.file;
      const imagePublicUrl = await uploadToStorage(imageFile, 'genres/images');
      newGenre.image = imagePublicUrl;
    }

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
      image: existingGenre.image,
    };
    console.log(updatedGenre);

    if (req.file) {
      const imageFile = req.file;
      const imagePublicUrl = await uploadToStorage(imageFile, 'genres/images');
      updatedGenre.image = imagePublicUrl;
    }
    await GenreModel.updateGenre(id, updatedGenre);
    res.status(200).json({ message: "Genre updated successfully", genre: updatedGenre });

  } catch (error) {
    console.error("Error updating genre:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteGenre = async (req, res) => {
  try {
    const { id } = req.params;

    const existingGenre = await GenreModel.getGenreById(id);
    if (!existingGenre) {
      return res.status(404).json({ message: 'Genre not found' });
    }
    const { image} = existingGenre;
    let shouldDeleteImage = true;
    if (image) {
      const genresWithSameImage = await GenreModel.getGenreByImage(image); 
      if (genresWithSameImage.length > 1) {
        shouldDeleteImage = false; 
      }
    }

    if (shouldDeleteImage && image) {
      const oldImagePath = image.replace('https://storage.googleapis.com/', '').replace('be-musicheals-a6d7a.appspot.com/', '');
      try {
        const file = bucket.file(oldImagePath);
        const exists = await file.exists(); 
        if (exists[0]) {
          await file.delete();
          console.log("Image deleted successfully.");
        } else {
          console.log("Image does not exist on Firebase, skipping deletion.");
        }
      } catch (error) {
        console.error("Error deleting old image:", error);
        return res.status(500).json({ message: 'Error deleting old image', error: error.message });
      }
    }

    if (existingGenre.image ) {
      // Tạo đường dẫn tệp từ URL
      const oldImagePath = existingGenre.image.replace('https://storage.googleapis.com/', '').replace('be-musicheals-a6d7a.appspot.com/', '');
      try {
        // Xóa hình ảnh
        await bucket.file(oldImagePath).delete();
        console.log("Image deleted successfully.");
      } catch (error) {
        console.error("Error deleting old image:", error);
        return res.status(500).json({ message: 'Error deleting old image', error: error.message });
      }
    }

    // Xóa thể loại
    await GenreModel.deleteGenre(id);
    res.json({ message: 'Genre deleted successfully' });
  } catch (error) {
    console.error('Error deleting genre:', error);
    res.status(500).json({ message: 'Error deleting genre', error: error.message });
  }
};




module.exports = { getAllGenres, getGenreById, createGenre, updateGenre, deleteGenre};
