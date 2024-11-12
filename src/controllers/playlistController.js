// playlistController.js
const PlaylistModel = require('../models/playlistModel');

const createPlaylist = async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ message: 'Playlist name is required' });
    }

    const playlistId = await PlaylistModel.createPlaylist(userId, name, description, isPublic);
    const playlist = await PlaylistModel.getPlaylistById(playlistId);

    res.status(201).json({
      message: 'Playlist created successfully',
      playlist
    });
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ message: 'Error creating playlist', error: error.message });
  }
};

const addSongToPlaylist = async (req, res) => {
  try {
    const { playlistId, songId } = req.body;
    const userId = req.user.id;

    const playlist = await PlaylistModel.getPlaylistById(playlistId);
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (playlist.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to modify this playlist' });
    }

    await PlaylistModel.addSongToPlaylist(playlistId, songId);
    res.json({ message: 'Song added to playlist successfully' });
  } catch (error) {
    console.error('Error adding song to playlist:', error);
    res.status(500).json({ message: 'Error adding song to playlist', error: error.message });
  }
};

const removeSongFromPlaylist = async (req, res) => {
  try {
    const { playlistId, songId } = req.params;
    const userId = req.user.id;

    const playlist = await PlaylistModel.getPlaylistById(playlistId);
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (playlist.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to modify this playlist' });
    }

    await PlaylistModel.removeSongFromPlaylist(playlistId, songId);
    res.json({ message: 'Song removed from playlist successfully' });
  } catch (error) {
    console.error('Error removing song from playlist:', error);
    res.status(500).json({ message: 'Error removing song from playlist', error: error.message });
  }
};

const getPlaylistById = async (req, res) => {
  try {
    const { id } = req.params;
    const playlist = await PlaylistModel.getPlaylistById(id);

    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (!playlist.isPublic && playlist.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this playlist' });
    }

    const songs = await PlaylistModel.getPlaylistSongs(id);
    res.json({ ...playlist, songs });
  } catch (error) {
    console.error('Error getting playlist:', error);
    res.status(500).json({ message: 'Error getting playlist', error: error.message });
  }
};

const getUserPlaylists = async (req, res) => {
  try {
    const userId = req.user.id;
    const playlists = await PlaylistModel.getUserPlaylists(userId);
    res.json(playlists);
  } catch (error) {
    console.error('Error getting user playlists:', error);
    res.status(500).json({ message: 'Error getting user playlists', error: error.message });
  }
};

const getPublicPlaylists = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const playlists = await PlaylistModel.getPublicPlaylists(page, limit);
    res.json(playlists);
  } catch (error) {
    console.error('Error getting public playlists:', error);
    res.status(500).json({ message: 'Error getting public playlists', error: error.message });
  }
};

const updatePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isPublic } = req.body;
    const userId = req.user.id;

    const playlist = await PlaylistModel.getPlaylistById(id);
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (playlist.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to modify this playlist' });
    }

    await PlaylistModel.updatePlaylist(id, { name, description, isPublic });
    const updatedPlaylist = await PlaylistModel.getPlaylistById(id);
    res.json(updatedPlaylist);
  } catch (error) {
    console.error('Error updating playlist:', error);
    res.status(500).json({ message: 'Error updating playlist', error: error.message });
  }
};

const deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const playlist = await PlaylistModel.getPlaylistById(id);
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (playlist.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this playlist' });
    }

    await PlaylistModel.deletePlaylist(id);
    res.json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    res.status(500).json({ message: 'Error deleting playlist', error: error.message });
  }
};

module.exports = {
  createPlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  getPlaylistById,
  getUserPlaylists,
  getPublicPlaylists,
  updatePlaylist,
  deletePlaylist
};