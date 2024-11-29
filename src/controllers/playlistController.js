// playlistController.js
const PlaylistModel = require('../models/playlistModel');
const { uploadToStorage } = require('../middlewares/uploadMiddleware');

const createPlaylist = async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;
    const userId = req.user.id;

    let imageUrl = null;
    if (req.files?.image?.[0]) {
      imageUrl = await uploadToStorage(req.files.image[0], 'playlists/images');
    }

    const playlistId = await PlaylistModel.createPlaylist(userId, name, description, isPublic, imageUrl);
    const playlist = await PlaylistModel.getPlaylistById(playlistId);

    res.status(201).json({
      success: true,
      data: playlist
    });
  } catch (error) {
    console.error('Create playlist error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updatePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isPublic } = req.body;
    const userId = req.user.id;

    const playlist = await PlaylistModel.getPlaylistById(id);
    if (!playlist || playlist.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    let imageUrl = playlist.image;
    if (req.files?.image?.[0]) {
      imageUrl = await uploadToStorage(req.files.image[0], 'playlists/images');
    }

    await PlaylistModel.updatePlaylist(id, {
      name,
      description,
      isPublic,
      image: imageUrl
    });

    const updatedPlaylist = await PlaylistModel.getPlaylistById(id);
    res.json({
      success: true,
      data: updatedPlaylist
    });
  } catch (error) {
    console.error('Update playlist error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const playlist = await PlaylistModel.getPlaylistById(id);
    if (!playlist || playlist.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await PlaylistModel.deletePlaylist(id);
    res.json({
      success: true,
      message: 'Playlist deleted successfully'
    });
  } catch (error) {
    console.error('Delete playlist error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getPublicPlaylists = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'DESC', 
      search = '' 
    } = req.query;

    // Validate pagination params
    const validPage = Math.max(1, parseInt(page));
    const validLimit = Math.min(50, Math.max(1, parseInt(limit)));

    // Validate sorting params
    const allowedSortColumns = ['createdAt', 'name', 'totalSongs'];
    const validSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'createdAt';
    const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    const playlists = await PlaylistModel.getPublicPlaylists(
      validPage,
      validLimit,
      validSortBy,
      validSortOrder,
      search
    );

    // Return empty array instead of 404 when no playlists found
    res.status(200).json({
      success: true,
      data: {
        items: playlists.items || [],
        pagination: {
          page: validPage,
          limit: validLimit,
          totalItems: playlists.pagination.totalItems,
          totalPages: playlists.pagination.totalPages
        },
        sort: {
          by: validSortBy,
          order: validSortOrder
        }
      }
    });

  } catch (error) {
    console.error('Error fetching public playlists:', error);
    res.status(500).json({
      success: false, 
      message: 'Internal Server Error'
    });
  }
};
const getPublicPlaylistById = async (req, res) => {
  try {
    const { id } = req.params;

    const playlist = await PlaylistModel.getPlaylistById(id);
    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found'
      });
    }

    // Check if playlist is public
    if (!playlist.isPublic) {
      return res.status(403).json({
        success: false,
        message: 'This playlist is private'
      });
    }

    // Get songs for public playlist
    const songs = await PlaylistModel.getPlaylistSongs(id);

    // Return playlist with songs
    res.json({
      success: true,
      data: {
        ...playlist,
        songs: songs.map(song => ({
          id: song.id,
          title: song.title,
          duration: song.duration,
          artistNames: song.artistNames?.split(',') || [],
          albumNames: song.albumNames?.split(',') || [],
          coverImage: song.coverImage,
          audioUrl: song.audioUrl
        }))
      }
    });
  } catch (error) {
    console.error('Get public playlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

const getPlaylistById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const playlist = await PlaylistModel.getPlaylistById(id);
    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found'
      });
    }

    if (!playlist.isPublic && playlist.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const songs = await PlaylistModel.getPlaylistSongs(id);
    res.json({
      success: true,
      data: { ...playlist, songs }
    });
  } catch (error) {
    console.error('Get playlist error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getUserPlaylists = async (req, res) => {
  try {
    const userId = req.user.id;
    const playlists = await PlaylistModel.getUserPlaylists(userId);
    res.json({
      success: true,
      data: playlists
    });
  } catch (error) {
    console.error('Get user playlists error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const addSongToPlaylist = async (req, res) => {
  try {
    const { playlistId, songId } = req.body;
    const userId = req.user.id;

    const playlist = await PlaylistModel.getPlaylistById(playlistId);
    if (!playlist || playlist.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await PlaylistModel.addSongToPlaylist(playlistId, songId);
    res.json({
      success: true,
      message: 'Song added successfully'
    });
  } catch (error) {
    console.error('Add song error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const removeSongFromPlaylist = async (req, res) => {
  try {
    const { playlistId, songId } = req.params;
    const userId = req.user.id;

    const playlist = await PlaylistModel.getPlaylistById(playlistId);
    if (!playlist || playlist.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await PlaylistModel.removeSongFromPlaylist(playlistId, songId);
    res.json({
      success: true,
      message: 'Song removed successfully'
    });
  } catch (error) {
    console.error('Remove song error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  getPublicPlaylists,
  getPlaylistById,
  getUserPlaylists,
  addSongToPlaylist,
  removeSongFromPlaylist,
  getPublicPlaylistById
};