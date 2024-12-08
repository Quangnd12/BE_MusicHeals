const db = require('../config/db');
const SongModel = require('../models/songModel');
const ArtistModel = require('../models/artistModel');
const AlbumModel = require('../models/albumModel');
const PlaylistModel = require('../models/playlistModel');
const GenreModel = require('../models/genreModel');

class SearchController {
    static async searchAll(req, res) {
        try {
            const { query, page = 1, limit = 10 } = req.query;

            if (!query) {
                return res.status(400).json({
                    success: false,
                    message: 'Từ khóa tìm kiếm không được để trống'
                });
            }

            // Thực hiện tìm kiếm song và đếm tổng
            const [songs, totalSongs] = await Promise.all([
                SongModel.searchSongs(query, page, limit),
                SongModel.getSongCount(query)
            ]);

            // Thực hiện tìm kiếm album và đếm tổng
            const [albums, totalAlbums] = await Promise.all([
                AlbumModel.searchAlbums(query, page, limit),
                AlbumModel.getAlbumCount(query)
            ]);

            // Thực hiện tìm kiếm artist và đếm tổng
            const [artists, totalArtists] = await Promise.all([
                ArtistModel.searchArtists(query, page, limit),
                ArtistModel.getArtistCount(query)
            ]);

            // Khởi tạo object kết quả
            const results = {};

            // Chỉ thêm vào results những category có kết quả khớp với chữ cái đầu
            if (songs && songs.length > 0) {
                const filteredSongs = songs.filter(song => 
                    song.title.toLowerCase().startsWith(query.toLowerCase()) ||
                    song.artists.some(artist => artist.toLowerCase().startsWith(query.toLowerCase()))
                );
                if (filteredSongs.length > 0) {
                    results.songs = {
                        items: filteredSongs,
                        total: totalSongs,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: Math.ceil(totalSongs / limit)
                    };
                }
            }

            if (albums && albums.length > 0) {
                const filteredAlbums = albums.filter(album => 
                    album.title.toLowerCase().startsWith(query.toLowerCase()) ||
                    album.artists.names.some(artist => artist.toLowerCase().startsWith(query.toLowerCase()))
                );
                if (filteredAlbums.length > 0) {
                    results.albums = {
                        items: filteredAlbums,
                        total: totalAlbums,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: Math.ceil(totalAlbums / limit)
                    };
                }
            }

            if (artists && artists.length > 0) {
                const filteredArtists = artists.filter(artist => 
                    artist.name.toLowerCase().startsWith(query.toLowerCase())
                );
                if (filteredArtists.length > 0) {
                    results.artists = {
                        items: filteredArtists,
                        total: totalArtists,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: Math.ceil(totalArtists / limit)
                    };
                }
            }

            // Kiểm tra nếu không có kết quả nào
            if (Object.keys(results).length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy kết quả phù hợp',
                    query: query
                });
            }

            return res.status(200).json({
                success: true,
                data: results,
                query: query,
                totalResults: {
                    songs: results.songs ? results.songs.items.length : 0,
                    albums: results.albums ? results.albums.items.length : 0,
                    artists: results.artists ? results.artists.items.length : 0
                }
            });

        } catch (error) {
            console.error('Lỗi tìm kiếm:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server khi tìm kiếm',
                error: error.message
            });
        }
    }

    // Tìm kiếm bài hát
    static async searchSongs(req, res) {
        try {
            const { query, page = 1, limit = 10 } = req.query;
            
            if (!query) {
                return res.status(400).json({
                    success: false,
                    message: 'Từ khóa tìm kiếm không được để trống'
                });
            }

            const [songs, totalSongs] = await Promise.all([
                SongModel.searchSongs(query, page, limit),
                SongModel.getSongCount(query)
            ]);

            if (!songs || songs.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy bài hát phù hợp',
                    query: query
                });
            }

            return res.status(200).json({
                success: true,
                data: {
                    items: songs,
                    total: totalSongs,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(totalSongs / limit)
                },
                query: query
            });

        } catch (error) {
            console.error('Lỗi tìm kiếm bài hát:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server khi tìm kiếm bài hát',
                error: error.message
            });
        }
    }

    // Tìm kiếm album
    static async searchAlbums(req, res) {
        try {
            const { query, page = 1, limit = 10 } = req.query;
            
            if (!query) {
                return res.status(400).json({
                    success: false,
                    message: 'Từ khóa tìm kiếm không được để trống'
                });
            }

            const [albums, totalAlbums] = await Promise.all([
                AlbumModel.searchAlbums(query, page, limit),
                AlbumModel.getAlbumCount(query)
            ]);

            if (!albums || albums.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy album phù hợp',
                    query: query
                });
            }

            return res.status(200).json({
                success: true,
                data: {
                    items: albums,
                    total: totalAlbums,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(totalAlbums / limit)
                },
                query: query
            });

        } catch (error) {
            console.error('Lỗi tìm kiếm album:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server khi tìm kiếm album',
                error: error.message
            });
        }
    }

    // Tìm kiếm nghệ sĩ
    static async searchArtists(req, res) {
        try {
            const { query, page = 1, limit = 10 } = req.query;
            
            if (!query) {
                return res.status(400).json({
                    success: false,
                    message: 'Từ khóa tìm kiếm không được để trống'
                });
            }

            const [artists, totalArtists] = await Promise.all([
                ArtistModel.searchArtists(query, page, limit),
                ArtistModel.getArtistCount(query)
            ]);

            if (!artists || artists.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy nghệ sĩ phù hợp',
                    query: query
                });
            }

            return res.status(200).json({
                success: true,
                data: {
                    items: artists,
                    total: totalArtists,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(totalArtists / limit)
                },
                query: query
            });

        } catch (error) {
            console.error('Lỗi tìm kiếm nghệ sĩ:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server khi tìm kiếm nghệ sĩ',
                error: error.message
            });
        }
    }
}

module.exports = SearchController; 