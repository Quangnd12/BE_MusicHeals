// playlistController.js
const PlaylistModel = require('../models/playlistModel');
const { uploadToStorage } = require("../middlewares/uploadMiddleware");

const getAllPlaylists = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const userId = req.user.id;
  const userRole = req.user.role;

  if (page < 1 || limit < 1) {
    return res.status(400).json({ message: 'Page and limit must be greater than 0.' });
  }

  try {
    let playlists;
    let totalCount;
    
    // Admin có thể xem tất cả playlist
    if (userRole === 'admin') {
      playlists = await PlaylistModel.getAllPlaylistsForAdmin(page, limit);
      totalCount = await PlaylistModel.getTotalPlaylistCount();
    } else {
      // User và artist chỉ xem được playlist của mình
      playlists = await PlaylistModel.getAllPlaylists(userId, page, limit);
      totalCount = await PlaylistModel.getPlaylistCount(userId);
    }

    const totalPages = Math.ceil(totalCount / limit);
    res.json({ 
      playlists, 
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving playlists', error: error.message });
  }
};

const getPlaylistById = async (req, res) => {
  try {
    const { id } = req.params;
    const playlist = await PlaylistModel.getPlaylistById(id);
    const userRole = req.user.role;

    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    // Kiểm tra quyền truy cập
    if (userRole !== 'admin' && playlist.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this playlist' });
    }

    res.json(playlist);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving playlist', error: error.message });
  }
};

const createPlaylist = async (req, res) => {
  try {
    const { title, description, isPublic = false } = req.body;
    let songs = [];
    
    try {
      songs = JSON.parse(req.body.songs || '[]');
    } catch (e) {
      return res.status(400).json({ message: 'Invalid songs data format' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Kiểm tra giới hạn playlist theo role
    const userPlaylists = await PlaylistModel.getPlaylistCount(userId);
    const playlistLimit = {
      'user': 5,
      'artist': 10,
      'admin': Infinity
    };

    if (userPlaylists >= playlistLimit[userRole]) {
      return res.status(403).json({ 
        message: `You have reached the maximum limit of playlists for your account type (${playlistLimit[userRole]} playlists)`
      });
    }

    const newPlaylist = {
      title,
      description: description || '',
      userId,
      isPublic,
      songs
    };

    if (req.file) {
      const imagePublicUrl = await uploadToStorage(req.file, 'playlists/images');
      newPlaylist.image = imagePublicUrl;
    }

    const playlistId = await PlaylistModel.createPlaylist(newPlaylist);
    const createdPlaylist = await PlaylistModel.getPlaylistById(playlistId);
    
    res.status(201).json(createdPlaylist);
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ message: 'Error creating playlist', error: error.message });
  }
};

const updatePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, isPublic } = req.body;
    let songs = [];
    
    try {
      songs = JSON.parse(req.body.songs || '[]');
    } catch (e) {
      return res.status(400).json({ message: 'Invalid songs data format' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if playlist exists
    const existingPlaylist = await PlaylistModel.getPlaylistById(id);
    if (!existingPlaylist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    // Check authorization
    if (userRole !== 'admin' && existingPlaylist.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this playlist' });
    }

    const updatedPlaylist = {
      title: title || existingPlaylist.title,
      description: description || existingPlaylist.description,
      isPublic: isPublic !== undefined ? isPublic : existingPlaylist.isPublic,
      songs
    };

    if (req.file) {
      const imagePublicUrl = await uploadToStorage(req.file, 'playlists/images');
      updatedPlaylist.image = imagePublicUrl;
    }

    await PlaylistModel.updatePlaylist(id, updatedPlaylist);
    const playlist = await PlaylistModel.getPlaylistById(id);
    res.json(playlist);
  } catch (error) {
    console.error('Error updating playlist:', error);
    res.status(500).json({ message: 'Error updating playlist', error: error.message });
  }
};

const deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if playlist exists
    const existingPlaylist = await PlaylistModel.getPlaylistById(id);
    if (!existingPlaylist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    // Check authorization
    if (userRole !== 'admin' && existingPlaylist.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this playlist' });
    }

    await PlaylistModel.deletePlaylist(id);
    res.json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    res.status(500).json({ message: 'Error deleting playlist', error: error.message });
  }
};

// Thêm phương thức để quản lý songs trong playlist
const addSongToPlaylist = async (req, res) => {
  try {
    const { playlistId, songId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if playlist exists and user has permission
    const playlist = await PlaylistModel.getPlaylistById(playlistId);
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (userRole !== 'admin' && playlist.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to modify this playlist' });
    }

    await PlaylistModel.addSongToPlaylist(playlistId, songId);
    res.json({ message: 'Song added to playlist successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error adding song to playlist', error: error.message });
  }
};

const removeSongFromPlaylist = async (req, res) => {
  try {
    const { playlistId, songId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if playlist exists and user has permission
    const playlist = await PlaylistModel.getPlaylistById(playlistId);
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (userRole !== 'admin' && playlist.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to modify this playlist' });
    }

    await PlaylistModel.removeSongFromPlaylist(playlistId, songId);
    res.json({ message: 'Song removed from playlist successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error removing song from playlist', error: error.message });
  }
};

module.exports = {
  getAllPlaylists,
  getPlaylistById, 
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist
};