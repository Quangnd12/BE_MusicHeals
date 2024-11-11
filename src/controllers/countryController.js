const CountryModel = require('../models/countryModel');


const getAllCountries = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const searchName = req.query.searchName || '';

  if (!page && !limit) {
    try {
      const countries = await CountryModel.getAllCountries(false, null, null, searchName);
      return res.status(200).json({ countries });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error retrieving countries', error: error.message });
    }
  }

  if (page < 1 || limit < 1) {
    return res.status(400).json({ message: 'Page and limit must be greater than 0.' });
  }

  try {

    let countries;
    if (!req.query.page || !req.query.limit) {
      countries = await CountryModel.getAllCountries(false, null, null, searchName);
      return res.status(200).json({ countries });
    }

    countries = await CountryModel.getAllCountries(true, page, limit, searchName);
    const totalCount = await CountryModel.getCountryCount();
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      countries,
      totalPages,
      totalCount,
      limit,
      currentPage: page
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error retrieving countries', error: error.message });
  }
};




const getCountryById = async (req, res) => {
  try {
    const { id } = req.params;
    const country = await CountryModel.getCountryById(id);

    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }

    res.json(country);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving country', error: error.message });
  }
};


const createCountry = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const newCountry = { name };

    const countryId = await CountryModel.createCountry(newCountry);
    res.status(200).json({ id: countryId, ...newCountry });

  } catch (error) {
    console.error('Error creating country:', error);
    if (error.message === 'A country with this name already exists') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error creating country', error: error.message });
  }
};

const updateCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const existingCountry = await CountryModel.getCountryById(id);

    if (!existingCountry) {
      return res.status(404).json({ message: 'Country not found' });
    }

    const updatedCountry = {
      name: req.body.name || existingCountry.name,
    };

    await CountryModel.updateCountry(id, updatedCountry);
    res.status(200).json({ message: "Country updated successfully", country: updatedCountry });

  } catch (error) {
    console.error("Error updating country:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteCountry = async (req, res) => {
  try {
    const { id } = req.params;

    const existingCountry = await CountryModel.getCountryById(id);
    if (!existingCountry) {
      return res.status(404).json({ message: 'Country not found' });
    }

    await CountryModel.deleteCountry(id);
    res.json({ message: 'Country deleted successfully' });
  } catch (error) {
    console.error('Error deleting country:', error);
    res.status(500).json({ message: 'Error deleting country', error: error.message });
  }
};

module.exports = { getAllCountries, getCountryById, createCountry, updateCountry, deleteCountry };
