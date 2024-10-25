const { db } = require("../config/firebase");
const admin = require("firebase-admin");

class Album {
  constructor(
    title,
    artistId,
    songId,
    describe,
    totalTracks,
    popularity,
    releaseDate,
    image
  ) {
    this.title = title;
    this.artistId = artistId;
    this.songId = songId;
    this.describe = describe;
    this.totalTracks = totalTracks || 0;
    this.popularity = popularity || 0;
    this.releaseDate = releaseDate;
    this.image = image;
  }

  static async uploadImage(file) {
    const bucket = admin.storage().bucket();
    const fileName = `album_images/${Date.now()}_${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    return new Promise((resolve, reject) => {
      stream.on("error", (error) => reject(error));

      stream.on("finish", async () => {
        await fileUpload.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`;
        resolve(publicUrl);
      });

      stream.end(file.buffer);
    });
  }

  static async create(data) {
    const titleLowerCase = data.title.toLowerCase();
    const existingAlbumSnapshot = await db
      .collection("albums")
      .where("titleLowerCase", "==", titleLowerCase)
      .get();

      // Xử lý artistId
  if (data.artistId) {
    data.artistId = Array.isArray(data.artistId)
      ? data.artistId
      : data.artistId.split(',').map(id => id.trim());
  }

  // Xử lý songId
  if (data.songId) {
    data.songId = Array.isArray(data.songId)
      ? data.songId
      : data.songId.split(',').map(id => id.trim());
  }

  if (!existingAlbumSnapshot.empty) {
    throw new Error("Album đã tồn tại");
  }
    const now = admin.firestore.FieldValue.serverTimestamp();
    const albumData = {
      ...data,
      titleLowerCase,
      createdAt: now,
      updatedAt: now,
    };

    const albumRef = await db.collection("albums").add(albumData);
    return albumRef.id;
  }

  static async findById(albumId) {
    if (!albumId || typeof albumId !== "string") {
      throw new Error("Invalid albumId");
    }

    const albumRef = await db.collection("albums").doc(albumId).get();
    if (!albumRef.exists) {
      return null;
    }

    const albumData = albumRef.data();

    const artistId = await Promise.all(
      (albumData.artistId || []).map(async (artistId) => {
        const artistRef = await db.collection("artists").doc(artistId).get();
        return artistRef.exists
          ? { id: artistRef.id, ...artistRef.data() }
          : null;
      })
    );

    // Lấy chi tiết songs dựa trên songId
    const songId = await Promise.all(
      (albumData.songId || []).map(async (songId) => {
        const songRef = await db.collection("songs").doc(songId).get();
        return songRef.exists ? { id: songRef.id, ...songRef.data() } : null;
      })
    );

    return {
      id: albumRef.id,
      ...albumData,
      artistId: artistId.filter(Boolean),
      songId: songId.filter(Boolean),
    };
  }

  static async update(albumId, data) {
    if (!albumId || typeof albumId !== "string") {
      throw new Error("Invalid albumId");
    }

    const albumRef = db.collection("albums").doc(albumId);
    const albumDoc = await albumRef.get();

    if (!albumDoc.exists) {
      return null;
    }

    if (data.title) {
      data.title = data.title.toLowerCase();
    }

    // Xử lý artistId
  if (data.artistId) {
    data.artistId = Array.isArray(data.artistId)
      ? data.artistId
      : data.artistId.split(',').map(id => id.trim());
  }

  // Xử lý songId
  if (data.songId) {
    data.songId = Array.isArray(data.songId)
      ? data.songId
      : data.songId.split(',').map(id => id.trim());
  }

    data.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    // Xử lý artistId, songId
    ["artistId", "songId"].forEach((field) => {
      if (data[field]) {
        data[field] = data[field].filter((id) => id && typeof id === "string");
      }
    });

    await albumRef.update(data);

    return await this.findById(albumId);
  }

  static async delete(albumId) {
    await db.collection("albums").doc(albumId).delete();
  }

  static async getAllAlbums(page = 1, limit = 5, searchTerm = "") {
    let query = db.collection("albums").orderBy("titleLowerCase", "asc");

    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      query = query
        .where("titleLowerCase", ">=", searchTermLower)
        .where("titleLowerCase", "<=", searchTermLower + "\uf8ff");
    }

    const countSnapshot = await query.get();
    const totalAlbums = countSnapshot.size;
    const startAt = (page - 1) * limit;
    query = query.offset(startAt).limit(limit);

    const snapshot = await query.get();
    const albums = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const albumData = doc.data();

        albumData.artistId = await this.getArtistDetails(
          albumData.artistId || []
        );
        albumData.songId = await this.getSongDetails(albumData.songId || []);

        return {
          id: doc.id,
          ...albumData,
        };
      })
    );

    return {
      albums,
      totalPages: Math.ceil(totalAlbums / limit),
      totalAlbums,
    };
  }

  static async getArtistDetails(artistIds) {
    const validArtistIds = artistIds.filter(
      (id) => id && typeof id === "string"
    );
    const artistPromises = validArtistIds.map(async (artistId) => {
      const artistDoc = await db.collection("artists").doc(artistId).get();
      return artistDoc.exists
        ? { id: artistDoc.id, ...artistDoc.data() }
        : null;
    });
    return (await Promise.all(artistPromises)).filter(Boolean);
  }

  static async getSongDetails(songIds) {
    const validSongIds = songIds.filter((id) => id && typeof id === "string");
    const songPromises = validSongIds.map(async (songId) => {
      const songDoc = await db.collection("songs").doc(songId).get();
      return songDoc.exists ? { id: songDoc.id, ...songDoc.data() } : null;
    });
    return (await Promise.all(songPromises)).filter(Boolean);
  }
}

module.exports = Album;
