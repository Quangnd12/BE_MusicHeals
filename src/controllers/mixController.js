const MixModel = require('../models/mixModel');
const SongModel = require('../models/songModel');
const db = require('../config/db');

const createMix = async (req, res) => {
  try {
    const { songIds, mixSettings } = req.body;

    if (!songIds || !Array.isArray(songIds) || songIds.length === 0) {
      return res.status(400).json({ message: 'At least one song ID is required' });
    }

    // Get song details
    const songPromises = songIds.map(id => SongModel.getSongById(id));
    const songs = await Promise.all(songPromises);

    // Check if all songs exist
    if (songs.some(song => !song)) {
      return res.status(404).json({ message: 'One or more songs not found' });
    }

    // Create mix
    const result = await MixModel.createMix(songs, mixSettings || {});

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating mix:', error);
    res.status(500).json({ message: 'Error creating mix', error: error.message });
  }
};

const getMixById = async (req, res) => {
  try {
    const { id } = req.params;
    const mix = await MixModel.getMixById(id);

    if (!mix) {
      return res.status(404).json({ message: 'Mix not found' });
    }

    res.json(mix);
  } catch (error) {
    console.error('Error getting mix:', error);
    res.status(500).json({ message: 'Error retrieving mix', error: error.message });
  }
};

const getAllMixes = async (req, res) => {
  try {
    const mixes = await MixModel.getAllMixes();
    res.json(mixes);
  } catch (error) {
    console.error('Error getting mixes:', error);
    res.status(500).json({ message: 'Error retrieving mixes', error: error.message });
  }
};


const deleteMix = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await MixModel.deleteMix(id);

    if (!result) {
      return res.status(404).json({ message: 'Mix not found' });
    }

    res.json({ message: 'Mix deleted successfully' });
  } catch (error) {
    console.error('Error deleting mix:', error);
    res.status(500).json({ message: 'Error deleting mix', error: error.message });
  }
};

module.exports = {
  createMix,
  getMixById,
  getAllMixes,
  deleteMix
};