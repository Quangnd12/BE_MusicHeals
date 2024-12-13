const ArtistAlbumModel = require('../models/artistAlbumModel');
const { bucket } = require('../config/firebase');

const ArtistAlbumController = {
  async createAlbum(req, res) {
    try {
      const artist_id = req.artist?.artist_id;
      
      if (!artist_id) {
        return res.status(401).json({ 
          message: "Không tìm thấy ID nghệ sĩ" 
        });
      }

      const { title, description, release_date } = req.body;
      
      if (!title) {
        return res.status(400).json({
          message: "Tiêu đề album là bắt buộc"
        });
      }

      let coverImageUrl = null;

      if (req.file) {
        const fileExt = req.file.originalname.split('.').pop();
        const fileName = `albums/album_${artist_id}_${Date.now().toString().slice(-6)}.${fileExt}`;
        const blob = bucket.file(fileName);
        
        await new Promise((resolve, reject) => {
          const blobStream = blob.createWriteStream({
            metadata: {
              contentType: req.file.mimetype,
            },
            public: true,
            resumable: false
          });

          blobStream.on('finish', async () => {
            try {
              await blob.makePublic();
              coverImageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
              resolve();
            } catch (error) {
              reject(error);
            }
          });
          
          blobStream.on('error', reject);
          blobStream.end(req.file.buffer);
        });
      }

      const albumData = {
        title,
        description: description || null,
        cover_image: coverImageUrl,
        release_date: release_date || null,
        artist_id
      };

      const albumId = await ArtistAlbumModel.createAlbum(albumData);

      res.status(201).json({
        message: "Tạo album thành công",
        albumId
      });

    } catch (error) {
      console.error("Lỗi khi tạo album:", error);
      res.status(500).json({
        message: "Lỗi server",
        error: error.message
      });
    }
  },

  async addSongsToAlbum(req, res) {
    try {
      const { album_id } = req.params;
      const { song_ids } = req.body;
      const artist_id = req.artist?.artist_id;

      // Chuyển đổi song_ids thành số
      const parsedSongIds = Array.isArray(song_ids) 
        ? song_ids.map(id => parseInt(id, 10))
        : [];

      if (!artist_id) {
        return res.status(401).json({
          message: "Không tìm thấy ID nghệ sĩ"
        });
      }

      if (!parsedSongIds.length) {
        return res.status(400).json({
          message: "Danh sách bài hát không hợp lệ"
        });
      }

      const result = await ArtistAlbumModel.addSongsToAlbum(
        parseInt(album_id, 10),
        parsedSongIds,
        artist_id
      );

      res.status(200).json({
        message: "Thêm bài hát vào album thành công",
        data: result
      });

    } catch (error) {
      res.status(500).json({
        message: error.message || "Lỗi server"
      });
    }
  },

  async getArtistAlbums(req, res) {
    try {
      const artist_id = req.artist?.artist_id;
      
      if (!artist_id) {
        return res.status(401).json({ 
          message: "Không tìm thấy ID nghệ sĩ" 
        });
      }

      const albums = await ArtistAlbumModel.getAlbumsByArtistId(artist_id);
      
      res.status(200).json({
        message: "Lấy danh sách album thành công",
        albums
      });

    } catch (error) {
      console.error("Lỗi khi lấy danh sách album:", error);
      res.status(500).json({
        message: "Lỗi server",
        error: error.message
      });
    }
  },

  async getAlbumDetails(req, res) {
    try {
      const { album_id } = req.params;
      const artist_id = req.artist?.artist_id;

      if (!artist_id) {
        return res.status(401).json({ 
          message: "Không tìm thấy ID nghệ sĩ" 
        });
      }

      const album = await ArtistAlbumModel.getAlbumWithSongs(album_id, artist_id);
      
      if (!album) {
        return res.status(404).json({
          message: "Không tìm thấy album"
        });
      }

      res.status(200).json({
        message: "Lấy thông tin album thành công",
        album
      });

    } catch (error) {
      console.error("Lỗi khi lấy thông tin album:", error);
      res.status(500).json({
        message: "Lỗi server",
        error: error.message
      });
    }
  },

  async updateAlbum(req, res) {
    try {
      const { album_id } = req.params;
      const artist_id = req.artist?.artist_id;
      const { title, description, release_date } = req.body;

      if (!artist_id) {
        return res.status(401).json({ 
          message: "Không tìm thấy ID nghệ sĩ" 
        });
      }

      const album = await ArtistAlbumModel.getAlbumById(album_id);
      
      if (!album || album.artist_id !== artist_id) {
        return res.status(404).json({
          message: "Không tìm thấy album"
        });
      }

      let coverImageUrl = album.cover_image;

      if (req.file) {
        // Xóa ảnh cũ nếu có
        if (album.cover_image && album.cover_image.includes('storage.googleapis.com')) {
          const oldImagePath = album.cover_image.split('/').pop();
          await bucket.file(`albums/${oldImagePath}`).delete().catch(console.error);
        }

        // Upload ảnh mới
        const fileExt = req.file.originalname.split('.').pop();
        const fileName = `albums/album_${artist_id}_${Date.now().toString().slice(-6)}.${fileExt}`;
        const blob = bucket.file(fileName);
        
        await new Promise((resolve, reject) => {
          const blobStream = blob.createWriteStream({
            metadata: {
              contentType: req.file.mimetype,
            },
            public: true,
            resumable: false
          });

          blobStream.on('finish', async () => {
            try {
              await blob.makePublic();
              coverImageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
              resolve();
            } catch (error) {
              reject(error);
            }
          });
          
          blobStream.on('error', reject);
          blobStream.end(req.file.buffer);
        });
      }

      await ArtistAlbumModel.updateAlbum(album_id, {
        title,
        description,
        cover_image: coverImageUrl,
        release_date
      });

      res.status(200).json({
        message: "Cập nhật album thành công"
      });

    } catch (error) {
      console.error("Lỗi khi cập nhật album:", error);
      res.status(500).json({
        message: "Lỗi server",
        error: error.message
      });
    }
  },

  async deleteAlbum(req, res) {
    try {
      const { album_id } = req.params;
      const artist_id = req.artist?.artist_id;

      if (!artist_id) {
        return res.status(401).json({ 
          message: "Không tìm thấy ID nghệ sĩ" 
        });
      }

      const album = await ArtistAlbumModel.getAlbumById(album_id);
      
      if (!album || album.artist_id !== artist_id) {
        return res.status(404).json({
          message: "Không tìm thấy album"
        });
      }

      // Xóa ảnh bìa nếu có
      if (album.cover_image && album.cover_image.includes('storage.googleapis.com')) {
        const imagePath = album.cover_image.split('/').pop();
        await bucket.file(`albums/${imagePath}`).delete().catch(console.error);
      }

      await ArtistAlbumModel.deleteAlbum(album_id);

      res.status(200).json({
        message: "Xóa album thành công"
      });

    } catch (error) {
      console.error("Lỗi khi xóa album:", error);
      res.status(500).json({
        message: "Lỗi server",
        error: error.message
      });
    }
  },

  async removeSongFromAlbum(req, res) {
    try {
      const { album_id, song_id } = req.params;
      const artist_id = req.artist?.artist_id;

      if (!artist_id) {
        return res.status(401).json({ 
          message: "Không tìm thấy ID nghệ sĩ" 
        });
      }

      const album = await ArtistAlbumModel.getAlbumById(album_id);
      
      if (!album || album.artist_id !== artist_id) {
        return res.status(404).json({
          message: "Không tìm thấy album"
        });
      }

      await ArtistAlbumModel.removeSongFromAlbum(album_id, song_id);

      res.status(200).json({
        message: "Xóa bài hát khỏi album thành công"
      });

    } catch (error) {
      console.error("Lỗi khi xóa bài hát khỏi album:", error);
      res.status(500).json({
        message: "Lỗi server",
        error: error.message
      });
    }
  }
};

module.exports = ArtistAlbumController;