const { db } = require("../config/firebase");

class Artist {
  constructor(name, bio, genre, albums, songs, followers, monthly_listeners) {
    this.name = name;
    this.bio = bio;
    this.genre = genre; // Array of genre IDs
    this.albums = albums; // Array of album IDs
    this.songs = songs; // Array of song IDs
    this.followers = followers; // Array of user IDs
    this.monthly_listeners = monthly_listeners || 0; // Số lượng người nghe hàng tháng
  }

  static async create(data) {
    const artistRef = await db.collection("artists").add(data);
    return artistRef.id;
  }

  static async findById(artistId) {
    const artistRef = await db.collection("artists").doc(artistId).get();
    if (!artistRef.exists) {
      throw new Error("Nghệ sĩ không tồn tại");
    }
    return { id: artistRef.id, ...artistRef.data() };
  }

  static async update(artistId, data) {
    await db.collection("artists").doc(artistId).update(data);
    return await this.findById(artistId);
  }

  static async delete(artistId) {
    await db.collection("artists").doc(artistId).delete();
  }

  static async getAll() {
    const snapshot = await db.collection("artists").get();
    const artists = [];
    snapshot.forEach(doc => {
      artists.push({ id: doc.id, ...doc.data() });
    });
    return artists;
  }
}

module.exports = Artist;
