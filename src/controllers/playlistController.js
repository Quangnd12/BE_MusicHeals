const PlaylistModel = require('../models/playlistModel');

const createPlaylist = async (req, res) => {
    try {
        const { name, description, isPublic } = req.body;
        const userId = req.user.id; // Assuming you have authentication middleware

        if (!name) {
            return res.status(400).json({ message: 'Playlist name is required' });
        }

        const playlistId = await PlaylistModel.createPlaylist({
            name,
            description,
            userId,
            isPublic
        });

        res.status(201).json({
            message: 'Playlist created successfully',
            playlistId
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error creating playlist',
            error: error.message
        });
    }
};

const addSongToPlaylist = async (req, res) => {
    try {
        const { playlistId } = req.params;
        const { songId } = req.body;

        await PlaylistModel.addSongToPlaylist(playlistId, songId);
        res.json({ message: 'Song added to playlist successfully' });
    } catch (error) {
        res.status(500).json({
            message: 'Error adding song to playlist',
            error: error.message
        });
    }
};

const getPlaylistDetails = async (req, res) => {
    try {
        const { playlistId } = req.params;
        const playlist = await PlaylistModel.getPlaylistDetails(playlistId);
        const songs = await PlaylistModel.getPlaylistSongs(playlistId);

        res.json({
            ...playlist,
            songs
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error getting playlist details',
            error: error.message
        });
    }
};

const removeSongFromPlaylist = async (req, res) => {
    try {
        const { playlistId, songId } = req.params;
        await PlaylistModel.removeSongFromPlaylist(playlistId, songId);

        res.json({ message: 'Song removed from playlist successfully' });
    } catch (error) {
        res.status(500).json({
            message: 'Error removing song from playlist',
            error: error.message
        });
    }
};

module.exports = {
    createPlaylist,
    addSongToPlaylist,
    getPlaylistDetails,
    removeSongFromPlaylist
};