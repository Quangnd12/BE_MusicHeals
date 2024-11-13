const SongArtistModel = require('../models/song-artistModel');

const getAllSongArtists = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 4;

  if (page < 1) {
    return res.status(400).json({ message: 'Page must be greater than 0.' });
  }

  try {
    const songArtists = await SongArtistModel.getAllSongArtists(page, limit);
    const totalCount = await SongArtistModel.getSongArtistCount();
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      songArtists,
      totalPages,
      totalCount,
      currentPage: page,
      limitPerPage: limit
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving song_artist records', error: error.message });
  }
};

const getSongArtistByArtistID = async (req, res) => {
  try {
    const { artistID } = req.params;
    const songArtist = await SongArtistModel.getSongArtistByArtistID(artistID);

    if (songArtist.length === 0) {
      return res.status(404).json({ message: 'No records found for this artistID' });
    }

    res.json(songArtist);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving song_artist by artistID', error: error.message });
  }
};

const getSongArtistBySongID = async (req, res) => {
  try {
    const { songID } = req.params;
    const songArtist = await SongArtistModel.getSongArtistBySongID(songID);

    if (songArtist.length === 0) {
      return res.status(404).json({ message: 'No records found for this songID' });
    }

    res.json(songArtist);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving song_artist by songID', error: error.message });
  }
};

module.exports = { getAllSongArtists, getSongArtistByArtistID, getSongArtistBySongID };

