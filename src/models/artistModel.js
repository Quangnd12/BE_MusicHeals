const { db } = require("../config/firebase");
const admin = require("firebase-admin");

class Artist {
  constructor(name, bio, albumId, avatar, songId, followerId, monthly_listeners) {
    this.name = name;
    this.bio = bio;
    this.albumId = albumId;
    this.songId = songId;
    this.followerId = followerId;
    this.avatar = avatar;
    this.monthly_listeners = monthly_listeners || 0;
  }

  static async uploadAvatar(file) {
    const bucket = admin.storage().bucket();
    const fileName = `avatars/${Date.now()}_${file.originalname}`;
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
    const nameLowerCase = data.name.toLowerCase();
    const existingArtistSnapshot = await db
      .collection("artists")
      .where("name_lower", "==", nameLowerCase)
      .get();
  
    if (!existingArtistSnapshot.empty) {
      throw new Error("Tên nghệ sĩ đã tồn tại");
    }

     // Xử lý albumId
     if (data.albumId) {
      data.albumId = Array.isArray(data.albumId)
        ? data.albumId
        : data.albumId.split(',').map(id => id.trim());
    }

    // Xử lý songId
    if (data.songId) {
      data.songId = Array.isArray(data.songId)
        ? data.songId
        : data.songId.split(',').map(id => id.trim());
    }

    // Xử lý followerId
    if (data.followerId) {
      data.followerId = Array.isArray(data.followerId)
        ? data.followerId
        : data.followerId.split(',').map(id => id.trim());
    }
  
    const now = admin.firestore.FieldValue.serverTimestamp();
    const artistData = {
      ...data,
      name_lower: nameLowerCase,
      createdAt: now,
      updatedAt: now,
    };
  
    const artistRef = await db.collection("artists").add(artistData);
    
    // Trả về ID của nghệ sĩ mới tạo thay vì toàn bộ đối tượng
    return artistRef.id;
  }
  

  static async findById(artistId) {
    if (!artistId || typeof artistId !== "string") {
      throw new Error("Invalid artistId");
    }
  
    // Lấy thông tin của nghệ sĩ
    const artistRef = await db.collection("artists").doc(artistId).get();
    if (!artistRef.exists) {
      return null;
    }
    
    const artistData = artistRef.data();
  
    // Lấy chi tiết albums dựa trên albumId
    const albumId = await Promise.all(
      (artistData.albumId || []).map(async (albumId) => {
        const albumRef = await db.collection("albums").doc(albumId).get();
        return albumRef.exists ? { id: albumRef.id, ...albumRef.data() } : null;
      })
    );
  
    // Lấy chi tiết songs dựa trên songId
    const songId = await Promise.all(
      (artistData.songId || []).map(async (songId) => {
        const songRef = await db.collection("songs").doc(songId).get();
        return songRef.exists ? { id: songRef.id, ...songRef.data() } : null;
      })
    );
  
    // Lấy chi tiết followers dựa trên followerId
    const followerId = await Promise.all(
      (artistData.followerId || []).map(async (followerId) => {
        const followerRef = await db.collection("follows").doc(followerId).get();
        return followerRef.exists ? { id: followerRef.id, ...followerRef.data() } : null;
      })
    );
  
    // Trả về dữ liệu nghệ sĩ kèm theo albums, songs, và followers chi tiết
    return {
      id: artistRef.id,
      ...artistData,
      albumId: albumId.filter(Boolean), // Lọc ra các giá trị hợp lệ
      songId: songId.filter(Boolean),   // Lọc ra các giá trị hợp lệ
      followerId: followerId.filter(Boolean) // Lọc ra các giá trị hợp lệ
    };
  }
  

  static async getAlbumDetails(albumIds) {
    const validAlbumIds = albumIds.filter(id => id && typeof id === 'string');
    const albumPromises = validAlbumIds.map(async (albumId) => {
      try {
        const albumDoc = await db.collection("albums").doc(albumId).get();
        if (albumDoc.exists) {
          return { id: albumDoc.id, ...albumDoc.data() };
        }
      } catch (error) {
        console.error(`Error fetching album ${albumId}:`, error);
      }
      return null;
    });
    return (await Promise.all(albumPromises)).filter(Boolean);
  }

  static async getSongDetails(songIds) {
    const validSongIds = songIds.filter(id => id && typeof id === 'string');
    const songPromises = validSongIds.map(async (songId) => {
      try {
        const songDoc = await db.collection("songs").doc(songId).get();
        if (songDoc.exists) {
          return { id: songDoc.id, ...songDoc.data() };
        }
      } catch (error) {
        console.error(`Error fetching song ${songId}:`, error);
      }
      return null;
    });
    return (await Promise.all(songPromises)).filter(Boolean);
  }

  static async getFollowerDetails(followerIds) {
    const validFollowerIds = followerIds.filter(id => id && typeof id === 'string');
    const followerPromises = validFollowerIds.map(async (followerId) => {
      try {
        const followerDoc = await db.collection("follows").doc(followerId).get();
        if (followerDoc.exists) {
          return { id: followerDoc.id, ...followerDoc.data() };
        }
      } catch (error) {
        console.error(`Error fetching follower ${followerId}:`, error);
      }
      return null;
    });
    return (await Promise.all(followerPromises)).filter(Boolean);
  }
  

  static async update(artistId, data) {
    if (!artistId || typeof artistId !== "string") {
      throw new Error("Invalid artistId");
    }

    const artistRef = db.collection("artists").doc(artistId);
    const artistDoc = await artistRef.get();

    if (!artistDoc.exists) {
      return null;
    }

    if (data.name) {
      data.name_lower = data.name.toLowerCase();
    }

     // Xử lý albumId
     if (data.albumId) {
      data.albumId = Array.isArray(data.albumId)
        ? data.albumId
        : data.albumId.split(',').map(id => id.trim());
    }

    // Xử lý songId
    if (data.songId) {
      data.songId = Array.isArray(data.songId)
        ? data.songId
        : data.songId.split(',').map(id => id.trim());
    }

    // Xử lý followerId
    if (data.followerId) {
      data.followerId = Array.isArray(data.followerId)
        ? data.followerId
        : data.followerId.split(',').map(id => id.trim());
    }

    data.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    // Xử lý albumId, songId và followerId
    ['albumId', 'songId', 'followerId'].forEach(field => {
      if (data[field]) {
        data[field] = data[field].filter(id => id && typeof id === 'string');
      }
    });

    await artistRef.update(data);
    // Thay đổi: Trả về kết quả đã được populate
    return await this.findById(artistId);
  }

  static async delete(artistId) {
    await db.collection("artists").doc(artistId).delete();
  }

  static async getAllArtists(page = 1, limit = 5, searchTerm = "") {
    let query = db.collection("artists").orderBy("name_lower", "asc");

  // Tìm kiếm nghệ sĩ dựa trên từ khóa tìm kiếm (searchTerm)
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      query = query.where("name_lower", ">=", searchTermLower)
                   .where("name_lower", "<=", searchTermLower + "\uf8ff");
    }
 // Lấy tổng số nghệ sĩ để tính tổng số trang
    const countSnapshot = await query.get();
    const totalArtists = countSnapshot.size;
 // Tính toán vị trí bắt đầu (offset) và giới hạn số lượng nghệ sĩ trả về
    const startAt = (page - 1) * limit;
    query = query.offset(startAt).limit(limit);

    const snapshot = await query.get();
    const artists = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const artistData = doc.data();
      // Lấy chi tiết albums dựa trên albumId
      artistData.albumId = await this.getAlbumDetails(artistData.albumId || []);

      // Lấy chi tiết songs dựa trên songId
      artistData.songId = await this.getSongDetails(artistData.songId || []);

      // Lấy chi tiết followers dựa trên followerId
      artistData.followerId = await this.getFollowerDetails(artistData.followerId || []);
        return {
          id: doc.id,
          ...artistData,
        };
      })
    );

    return {
      artists,
      totalPages: Math.ceil(totalArtists / limit),
      totalArtists,
    };
  }
}

module.exports = Artist;