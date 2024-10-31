const ArtistModel = require('../models/artistModel'); // Chỉnh sửa để import artist model
const { bucket } = require("../config/firebase");
const { format } = require("util");
const path = require("path");

const getAllArtists = async (req, res) => {
  try {
    const artists = await ArtistModel.getAllArtist(); // Sửa tên hàm
    res.json(artists);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving artists', error: error.message });
  }
};


const getArtistById = async (req, res) => {
  try {
    const { id } = req.params;
    const artist = await ArtistModel.getArtistById(id);

    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    res.json(artist);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving artist', error: error.message });
  }
};


const createArtist = async (req, res) => {
  try {
    const { name, role, biography } = req.body;
    if (!name || !role) {
      return res.status(400).json({ message: 'Name and role are required' });
    }

    const newArtist = { name, role, biography };

    if (req.file) {
      const timestamp = Date.now();
      const fileName = `artists/${timestamp}_${path.basename(req.file.originalname)}`;
      const blob = bucket.file(fileName);

      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      blobStream.on("error", (error) => {
        console.error("Upload error:", error);
        return res.status(500).json({ message: "Unable to upload image", error });
      });

      blobStream.on("finish", async () => {
        const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
        newArtist.avatar = publicUrl;

        const artistId = await ArtistModel.createArtist(newArtist);
        res.status(201).json({ id: artistId, ...newArtist });
      });

      blobStream.end(req.file.buffer);
    } else {
      const artistId = await ArtistModel.createArtist(newArtist);
      res.status(201).json({ id: artistId, ...newArtist });
    }
  } catch (error) {
    console.error('Error creating artist:', error);
    if (error.message === 'An artist with this name already exists') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error creating artist', error: error.message });
  }
};


const updateArtist = async (req, res) => {
  try {
    const { id } = req.params;
    const existingArtist = await ArtistModel.getArtistById(id);
    if (!existingArtist) {
      return res.status(404).json({ message: 'Artist not found' });
    }
    const updatedArtist = {
      name: req.body.name || existingArtist.name,
      avatar: existingArtist.avatar,
      role: req.body.role || existingArtist.role,
      biography: req.body.biography || existingArtist.biography,
    };

    if (req.file) {
      if (existingArtist.avatar && existingArtist.avatar.includes("firebase")) {
        const oldImagePath = existingArtist.avatar.split("/o/")[1].split("?")[0];
        try {
          await bucket.file(decodeURIComponent(oldImagePath)).delete();
        } catch (error) {
          console.log("Error deleting old image:", error);
        }
      }

      const timestamp = Date.now();
      const fileName = `artists/${id}_${timestamp}_${path.basename(req.file.originalname)}`;
      const blob = bucket.file(fileName);

      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      blobStream.on("error", (error) => {
        console.error("Upload error:", error);
        return res.status(500).json({ message: "Unable to upload image", error });
      });

      blobStream.on("finish", async () => {
        const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
        updatedArtist.avatar = publicUrl;

        await ArtistModel.updateArtist(id, updatedArtist);
        res.status(200).json({
          message: "Artist updated successfully",
          avatarUrl: publicUrl,
        });
      });

      blobStream.end(req.file.buffer);
    } else {
      await ArtistModel.updateArtist(id, updatedArtist);
      res.status(200).json({ message: "Artist updated successfully" });
    }
  } catch (error) {
    console.error("Error updating artist:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Xóa artist theo ID
const deleteArtist = async (req, res) => {
  try {
    const { id } = req.params;

    const existingArtist = await ArtistModel.getArtistById(id);
    if (!existingArtist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    if (existingArtist.avatar && existingArtist.avatar.includes("firebase")) {
      const oldImagePath = existingArtist.avatar.split("/o/")[1].split("?")[0];
      try {
        await bucket.file(decodeURIComponent(oldImagePath)).delete();
      } catch (error) {
        console.error("Error deleting old image:", error);
      }
    }

    await ArtistModel.deleteArtist(id);
    res.json({ message: 'Artist deleted successfully' });
  } catch (error) {
    console.error('Error deleting artist:', error);
    res.status(500).json({ message: 'Error deleting artist', error: error.message });
  }
};

// Upload ảnh artist
const uploadArtistImage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const existingArtist = await ArtistModel.getArtistById(id);
    if (!existingArtist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    if (existingArtist.avatar && existingArtist.avatar.includes("firebase")) {
      const oldImagePath = existingArtist.avatar.split("/o/")[1].split("?")[0];
      try {
        await bucket.file(decodeURIComponent(oldImagePath)).delete();
      } catch (error) {
        console.log("Error deleting old image:", error);
      }
    }

    const timestamp = Date.now();
    const fileName = `artists/${id}_${timestamp}_${path.basename(req.file.originalname)}`;
    const blob = bucket.file(fileName);

    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    blobStream.on("error", (error) => {
      console.error("Upload error:", error);
      return res.status(500).json({ message: "Unable to upload image", error });
    });

    blobStream.on("finish", async () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      await ArtistModel.updateArtistImage(id, publicUrl);

      res.status(200).json({
        message: "Artist image uploaded successfully",
        imageUrl: publicUrl,
      });
    });

    blobStream.end(req.file.buffer);
  } catch (error) {
    console.error("Error uploading artist image:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { getAllArtists, getArtistById, createArtist, updateArtist, deleteArtist, uploadArtistImage };
