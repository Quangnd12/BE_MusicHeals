const SongModel = require('../models/songModel'); 
const { bucket } = require("../config/firebase");
const { format } = require("util");
const path = require("path");

// Lấy tất cả bài hát
const getAllSongs = async (req, res) => {
  try {
    const songs = await SongModel.getAllSongs(); // Sửa tên hàm
    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving songs', error: error.message });
  }
};


const getSongById = async (req, res) => {
  try {
    const { id } = req.params;
    const song = await SongModel.getSongById(id);

    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    res.json(song);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving song', error: error.message });
  }
};

// Tạo bài hát mới
const createSong = async (req, res) => {
  try {
    const { title, artistID, albumID, genreID, lyrics, duration, releaseDate, is_explicit } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!title || !artistID || !genreID) {
      return res.status(400).json({ message: 'Title, artistID, and genreID are required' });
    }

    // Tạo bài hát mới
    const newSong = { 
      title, 
      artistID, 
      albumID, 
      genreID, 
      lyrics: lyrics || null, // lyrics có thể là null
      duration, 
      releaseDate, 
      is_explicit: is_explicit || false, 
      listens_count: 0 // Mặc định là 0
    };

    // Xử lý upload file nhạc và hình ảnh
    if (req.files) {
      // Xử lý hình ảnh
      if (req.files.image && req.files.image.length > 0) {
        const imageFile = req.files.image[0];
        const imageFileName = `songs/images/${Date.now()}_${imageFile.originalname}`;
        const imageBlob = bucket.file(imageFileName);

        const imageBlobStream = imageBlob.createWriteStream({
          metadata: {
            contentType: imageFile.mimetype,
          },
        });

        imageBlobStream.on("error", (error) => {
          console.error("Upload image error:", error);
          return res.status(500).json({ message: "Unable to upload image", error });
        });

        imageBlobStream.on("finish", async () => {
          const imagePublicUrl = format(`https://storage.googleapis.com/${bucket.name}/${imageBlob.name}`);
          newSong.image = imagePublicUrl; // Lưu URL hình ảnh vào newSong

          // Sau khi upload xong hình ảnh, tiếp tục upload file nhạc
          if (req.files.file_song && req.files.file_song.length > 0) {
            const audioFile = req.files.file_song[0];
            const audioFileName = `songs/audio/${Date.now()}_${audioFile.originalname}`;
            const audioBlob = bucket.file(audioFileName);

            const audioBlobStream = audioBlob.createWriteStream({
              metadata: {
                contentType: audioFile.mimetype,
              },
            });

            audioBlobStream.on("error", (error) => {
              console.error("Upload audio error:", error);
              return res.status(500).json({ message: "Unable to upload audio", error });
            });

            audioBlobStream.on("finish", async () => {
              const audioPublicUrl = format(`https://storage.googleapis.com/${bucket.name}/${audioBlob.name}`);
              newSong.file_song = audioPublicUrl; // Lưu URL file nhạc vào newSong

              // Tạo bài hát trong database
              const songId = await SongModel.createSong(newSong);
              res.status(201).json({ id: songId, ...newSong });
            });

            audioBlobStream.end(req.files.file_song[0].buffer); // Kết thúc stream file nhạc
          } else {
            // Nếu không có file nhạc
            const songId = await SongModel.createSong(newSong);
            res.status(201).json({ id: songId, ...newSong });
          }
        });

        imageBlobStream.end(req.files.image[0].buffer); // Kết thúc stream hình ảnh
      } else {
        // Nếu không có hình ảnh
        if (req.files.file_song && req.files.file_song.length > 0) {
          const audioFile = req.files.file_song[0];
          const audioFileName = `songs/audio/${Date.now()}_${audioFile.originalname}`;
          const audioBlob = bucket.file(audioFileName);

          const audioBlobStream = audioBlob.createWriteStream({
            metadata: {
              contentType: audioFile.mimetype,
            },
          });

          audioBlobStream.on("error", (error) => {
            console.error("Upload audio error:", error);
            return res.status(500).json({ message: "Unable to upload audio", error });
          });

          audioBlobStream.on("finish", async () => {
            const audioPublicUrl = format(`https://storage.googleapis.com/${bucket.name}/${audioBlob.name}`);
            newSong.file_song = audioPublicUrl; // Lưu URL file nhạc vào newSong

            // Tạo bài hát trong database
            const songId = await SongModel.createSong(newSong);
            res.status(201).json({ id: songId, ...newSong });
          });

          audioBlobStream.end(req.files.file_song[0].buffer); // Kết thúc stream file nhạc
        } else {
          // Không có cả hình ảnh và file nhạc
          const songId = await SongModel.createSong(newSong);
          res.status(201).json({ id: songId, ...newSong });
        }
      }
    } else {
      // Nếu không có file nào được upload
      const songId = await SongModel.createSong(newSong);
      res.status(201).json({ id: songId, ...newSong });
    }
  } catch (error) {
    console.error('Error creating song:', error);
    res.status(500).json({ message: 'Error creating song', error: error.message });
  }
};


const updateSong = async (req, res) => {
  try {
    const { id } = req.params;
    const existingSong = await SongModel.getSongById(id);
    if (!existingSong) {
      return res.status(404).json({ message: 'Song not found' });
    }

    const updatedSong = {
      title: req.body.title || existingSong.title,
      image: existingSong.image,
      file_song: existingSong.file_song,
      artistID: req.body.artistID || existingSong.artistID,
      albumID: req.body.albumID || existingSong.albumID,
      genreID: req.body.genreID || existingSong.genreID,
      lyrics: req.body.lyrics || existingSong.lyrics,
      duration: req.body.duration || existingSong.duration,
      listens_count: req.body.listens_count !== undefined ? req.body.listens_count : existingSong.listens_count,
      releaseDate: req.body.releaseDate || existingSong.releaseDate,
      is_explicit: req.body.is_explicit !== undefined ? req.body.is_explicit : existingSong.is_explicit,
    };
    // Xử lý hình ảnh nếu có
    if (req.files && req.files.image && req.files.image.length > 0) {
      if (existingSong.image && existingSong.image.includes("firebase")) {
        const oldImagePath = existingSong.image.split("/o/")[1].split("?")[0];
        try {
          await bucket.file(decodeURIComponent(oldImagePath)).delete();
        } catch (error) {
          console.log("Error deleting old image:", error);
        }
      }

      const imageFile = req.files.image[0];
      const imageFileName = `songs/images/${Date.now()}_${imageFile.originalname}`;
      const imageBlob = bucket.file(imageFileName);

      const imageBlobStream = imageBlob.createWriteStream({
        metadata: {
          contentType: imageFile.mimetype,
        },
      });

      imageBlobStream.on("error", (error) => {
        console.error("Upload image error:", error);
        return res.status(500).json({ message: "Unable to upload image", error });
      });

      imageBlobStream.on("finish", async () => {
        const imagePublicUrl = format(`https://storage.googleapis.com/${bucket.name}/${imageBlob.name}`);
        updatedSong.image = imagePublicUrl; // Cập nhật URL hình ảnh mới
        // Cập nhật bài hát với hình ảnh mới
        await SongModel.updateSong(id, updatedSong);
      });

      imageBlobStream.end(imageFile.buffer); // Kết thúc stream hình ảnh
    }

    // Xử lý âm thanh nếu có
    if (req.files && req.files.file_song && req.files.file_song.length > 0) {
      if (existingSong.file_song && existingSong.file_song.includes("firebase")) {
        const oldFilePath = existingSong.file_song.split("/o/")[1].split("?")[0];
        try {
          await bucket.file(decodeURIComponent(oldFilePath)).delete();
        } catch (error) {
          console.log("Error deleting old audio file:", error);
        }
      }

      const audioFile = req.files.file_song[0];
      const audioFileName = `songs/audio/${Date.now()}_${audioFile.originalname}`;
      const audioBlob = bucket.file(audioFileName);

      const audioBlobStream = audioBlob.createWriteStream({
        metadata: {
          contentType: audioFile.mimetype,
        },
      });

      audioBlobStream.on("error", (error) => {
        console.error("Upload audio error:", error);
        return res.status(500).json({ message: "Unable to upload audio", error });
      });

      audioBlobStream.on("finish", async () => {
        const audioPublicUrl = format(`https://storage.googleapis.com/${bucket.name}/${audioBlob.name}`);
        updatedSong.file_song = audioPublicUrl; // Cập nhật URL âm thanh mới
        // Cập nhật bài hát với âm thanh mới
        await SongModel.updateSong(id, updatedSong);
        res.status(200).json({ message: "Song updated successfully"});
      });

      audioBlobStream.end(audioFile.buffer); // Kết thúc stream file âm thanh
    } else {
      // Nếu không có tệp nào được tải lên, chỉ cập nhật thông tin bài hát
      await SongModel.updateSong(id, updatedSong);
      res.status(200).json({ message: "Song updated successfully" });
    }

  } catch (error) {
    console.error("Error updating song:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Xóa bài hát theo ID
const deleteSong = async (req, res) => {
  try {
    const { id } = req.params;

    const existingSong = await SongModel.getSongById(id);
    if (!existingSong) {
      return res.status(404).json({ message: 'Song not found' });
    }

    if (existingSong.file_song && existingSong.file_song.includes("firebase")) {
      const oldFilePath = existingSong.file_song.split("/o/")[1].split("?")[0];
      try {
        await bucket.file(decodeURIComponent(oldFilePath)).delete();
      } catch (error) {
        console.error("Error deleting old file:", error);
      }
    }

    await SongModel.deleteSong(id);
    res.json({ message: 'Song deleted successfully' });
  } catch (error) {
    console.error('Error deleting song:', error);
    res.status(500).json({ message: 'Error deleting song', error: error.message });
  }
};

// Upload file bài hát
const uploadSongFile = async (req, res) => {
  try {
    const { id } = req.params;

    const existingSong = await SongModel.getSongById(id);
    if (!existingSong) {
      return res.status(404).json({ message: 'Song not found' });
    }

    // Xử lý tải lên file âm thanh
    if (req.files && req.files.file_song && req.files.file_song.length > 0) {
      const audioFile = req.files.file_song[0];

      if (existingSong.file_song && existingSong.file_song.includes("firebase")) {
        const oldFilePath = existingSong.file_song.split("/o/")[1].split("?")[0];
        try {
          await bucket.file(decodeURIComponent(oldFilePath)).delete();
        } catch (error) {
          console.log("Error deleting old file:", error);
        }
      }

      const timestamp = Date.now();
      const audioFileName = `songs/audio/${id}_${timestamp}_${path.basename(audioFile.originalname)}`;
      const audioBlob = bucket.file(audioFileName);

      const audioBlobStream = audioBlob.createWriteStream({
        metadata: {
          contentType: audioFile.mimetype,
        },
      });

      audioBlobStream.on("error", (error) => {
        console.error("Upload audio error:", error);
        return res.status(500).json({ message: "Unable to upload audio", error });
      });

      audioBlobStream.on("finish", async () => {
        const audioPublicUrl = `https://storage.googleapis.com/${bucket.name}/${audioBlob.name}`;
        await SongModel.updateSong(id, { file_song: audioPublicUrl }); // Cập nhật URL file nhạc mới

        res.status(200).json({
          message: "Song file uploaded successfully",
          fileUrl: audioPublicUrl,
        });
      });

      audioBlobStream.end(audioFile.buffer); // Kết thúc stream file nhạc

    // Xử lý tải lên hình ảnh
    } else if (req.files && req.files.image && req.files.image.length > 0) {
      const imageFile = req.files.image[0];

      if (existingSong.image && existingSong.image.includes("firebase")) {
        const oldImagePath = existingSong.image.split("/o/")[1].split("?")[0];
        try {
          await bucket.file(decodeURIComponent(oldImagePath)).delete();
        } catch (error) {
          console.log("Error deleting old image:", error);
        }
      }

      const timestamp = Date.now();
      const imageFileName = `songs/images/${id}_${timestamp}_${path.basename(imageFile.originalname)}`;
      const imageBlob = bucket.file(imageFileName);

      const imageBlobStream = imageBlob.createWriteStream({
        metadata: {
          contentType: imageFile.mimetype,
        },
      });

      imageBlobStream.on("error", (error) => {
        console.error("Upload image error:", error);
        return res.status(500).json({ message: "Unable to upload image", error });
      });

      imageBlobStream.on("finish", async () => {
        const imagePublicUrl = `https://storage.googleapis.com/${bucket.name}/${imageBlob.name}`;
        await SongModel.updateSong(id, { image: imagePublicUrl }); // Cập nhật URL hình ảnh mới

        res.status(200).json({
          message: "Song image uploaded successfully",
          imageUrl: imagePublicUrl,
        });
      });

      imageBlobStream.end(imageFile.buffer); // Kết thúc stream hình ảnh
    } else {
      return res.status(400).json({ message: 'No file uploaded' });
    }
  } catch (error) {
    console.error("Error uploading song file or image:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


module.exports = { getAllSongs, getSongById, createSong, updateSong, deleteSong, uploadSongFile };
