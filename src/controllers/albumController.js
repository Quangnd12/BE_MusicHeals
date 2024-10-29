const AlbumModel = require('../models/albumModel');
const multer = require('multer'); // Import multer cho upload file
const { bucket } = require("../config/firebase");
const { format } = require("util");
const path = require("path");
// Cấu hình multer
const upload = multer({ storage: multer.memoryStorage() });

// Lấy tất cả albums
const getAllAlbums = async (req, res) => {
  try {
    const albums = await AlbumModel.getAllAlbums();
    res.json(albums);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving albums', error: error.message });
  }
};

// Lấy album theo ID
const getAlbumById = async (req, res) => {
  try {
    const { id } = req.params;
    const album = await AlbumModel.getAlbumById(id);

    if (!album) {
      return res.status(404).json({ message: 'Album not found' });
    }

    res.json(album);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving album', error: error.message });
  }
};

// Tạo album mới
const createAlbum = async (req, res) => {
  try {
    const { title, artistID, releaseDate } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!title || !artistID || !releaseDate) {
      return res.status(400).json({ message: 'Title, artistID, and releaseDate are required' });
    }

    // Tạo album mới
    const newAlbum = { title, artistID, releaseDate };

    // Xử lý ảnh album nếu có
    if (req.file) {
      // Tạo tên file mới với albumId để tránh trùng lặp
      const timestamp = Date.now();
      const fileName = `albums/${timestamp}_${path.basename(req.file.originalname)}`;
      const blob = bucket.file(fileName);

      // Tạo stream để upload file
      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      // Xử lý lỗi trong quá trình upload
      blobStream.on("error", (error) => {
        console.error("Upload error:", error);
        return res.status(500).json({ message: "Unable to upload image", error });
      });

      // Khi upload hoàn tất
      blobStream.on("finish", async () => {
        // Tạo URL công khai cho file
        const publicUrl = format(
          `https://storage.googleapis.com/${bucket.name}/${blob.name}`
        );
        
        // Cập nhật URL ảnh vào newAlbum
        newAlbum.image = publicUrl;

        // Lưu album vào database và lấy ID mới
        const albumId = await AlbumModel.createAlbum(newAlbum);

        // Trả về thông tin album mới, bao gồm ID
        res.status(201).json({ id: albumId, ...newAlbum });
      });

      // Ghi dữ liệu file vào stream
      blobStream.end(req.file.buffer);
    } else {
      // Nếu không có file mới, chỉ lưu album vào database mà không có ảnh
      const albumId = await AlbumModel.createAlbum(newAlbum);
      res.status(201).json({ id: albumId, ...newAlbum });
    }
  } catch (error) {
    console.error('Error creating album:', error);
    res.status(500).json({ message: 'Error creating album', error: error.message });
  }
};


// Cập nhật album theo ID
const updateAlbum = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedAlbum = req.body;

    // Kiểm tra album có tồn tại không
    const existingAlbum = await AlbumModel.getAlbumById(id);
    if (!existingAlbum) {
      return res.status(404).json({ message: 'Album not found' });
    }

    // Kiểm tra và xử lý ảnh album nếu có file mới
    if (req.file) {
      // Nếu album có ảnh cũ và ảnh này ở Firebase, xóa ảnh cũ trước khi upload
      if (existingAlbum.image && existingAlbum.image.includes("firebase")) {
        const oldImagePath = existingAlbum.image.split("/o/")[1].split("?")[0];
        try {
          await bucket.file(decodeURIComponent(oldImagePath)).delete();
        } catch (error) {
          console.log("Error deleting old image:", error);
          // Tiếp tục upload ảnh mới
        }
      }

      // Tạo tên file mới với albumId để tránh trùng lặp
      const timestamp = Date.now();
      const fileName = `albums/${id}_${timestamp}_${path.basename(req.file.originalname)}`;
      const blob = bucket.file(fileName);

      // Tạo stream để upload file
      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      // Xử lý lỗi trong quá trình upload
      blobStream.on("error", (error) => {
        console.error("Upload error:", error);
        return res.status(500).json({ message: "Unable to upload image", error });
      });

      // Khi upload hoàn tất
      blobStream.on("finish", async () => {
        // Tạo URL công khai cho file
        const publicUrl = format(
          `https://storage.googleapis.com/${bucket.name}/${blob.name}`
        );
        // Cập nhật URL ảnh mới vào updatedAlbum
        updatedAlbum.image = publicUrl;

        // Cập nhật album trong database
        await AlbumModel.updateAlbum(id, updatedAlbum);
        res.status(200).json({
          message: "Album updated successfully",
          imageUrl: publicUrl,
        });
      });

      // Ghi dữ liệu file vào stream
      blobStream.end(req.file.buffer);
    } else {
      // Nếu không có file mới, chỉ cập nhật thông tin album
      await AlbumModel.updateAlbum(id, updatedAlbum);
      res.status(200).json({ message: "Album updated successfully" });
    }
  } catch (error) {
    console.error("Error updating album:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Xóa album theo ID
// Xóa album theo ID
const deleteAlbum = async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra album có tồn tại không
    const existingAlbum = await AlbumModel.getAlbumById(id);
    if (!existingAlbum) {
      return res.status(404).json({ message: 'Album not found' });
    }

    // Nếu album có ảnh và ảnh này ở Firebase, xóa ảnh khỏi Firebase
    if (existingAlbum.image && existingAlbum.image.includes("firebase")) {
      const oldImagePath = existingAlbum.image.split("/o/")[1].split("?")[0];
      try {
        await bucket.file(decodeURIComponent(oldImagePath)).delete();
      } catch (error) {
        console.error("Error deleting old image:", error);
        // Ghi chú: Có thể không cần phải ngăn việc xóa album nếu không xóa được ảnh
      }
    }

    // Xóa album khỏi database
    await AlbumModel.deleteAlbum(id);
    res.json({ message: 'Album deleted successfully' });
  } catch (error) {
    console.error('Error deleting album:', error);
    res.status(500).json({ message: 'Error deleting album', error: error.message });
  }
};


// Upload ảnh album
const uploadAlbumImage = async (req, res) => {
  try {
    const { id } = req.params; // ID của album cần cập nhật ảnh

    // Kiểm tra file tải lên
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Kiểm tra album có tồn tại không
    const existingAlbum = await AlbumModel.getAlbumById(id);
    if (!existingAlbum) {
      return res.status(404).json({ message: 'Album not found' });
    }

    // Xử lý xóa ảnh cũ nếu có
    if (existingAlbum.image && existingAlbum.image.includes("firebase")) {
      const oldImagePath = existingAlbum.image.split("/o/")[1].split("?")[0];
      try {
        await bucket.file(decodeURIComponent(oldImagePath)).delete();
      } catch (error) {
        console.log("Error deleting old image:", error);
        // Không return lỗi ở đây, tiếp tục upload ảnh mới
      }
    }

    // Tạo tên file mới với albumId để tránh trùng lặp
    const timestamp = Date.now();
    const fileName = `albums/${id}_${timestamp}_${path.basename(req.file.originalname)}`;
    const blob = bucket.file(fileName);

    // Tạo stream để upload file
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    // Xử lý lỗi trong quá trình upload
    blobStream.on("error", (error) => {
      console.error("Upload error:", error);
      return res.status(500).json({ message: "Unable to upload image", error });
    });

    // Khi upload hoàn tất
    blobStream.on("finish", async () => {
      // Tạo URL công khai cho file
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

      // Cập nhật URL ảnh mới vào database
      await AlbumModel.updateAlbumImage(id, publicUrl); // Giả sử bạn có hàm này trong AlbumModel

      res.status(200).json({
        message: "Album image uploaded successfully",
        imageUrl: publicUrl,
      });
    });

    // Ghi dữ liệu file vào stream
    blobStream.end(req.file.buffer);
  } catch (error) {
    console.error("Error uploading album image:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


module.exports = { getAllAlbums, getAlbumById, createAlbum, updateAlbum, deleteAlbum, uploadAlbumImage };
