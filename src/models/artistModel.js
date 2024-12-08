const db = require('../config/db');

class ArtistModel {
  static async getAllArtist(page, limit) {
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        artists.id AS id,
        artists.name AS name,
        artists.avatar AS avatar,
        artists.role AS role,
        artists.biography AS biography
      FROM artists
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await db.execute(query);
    return rows;
  }



  static async getArtistCount() {
    const query = 'SELECT COUNT(*) as count FROM artists';
    const [rows] = await db.execute(query);
    return rows[0].count;
  }

  static async getArtistById(id) {
    const query = `
      SELECT 
        artists.id AS artistId,
        artists.name AS artistName,
        artists.avatar AS artistAvatar,
        artists.role AS artistRole,
        artists.biography AS artistBiography,
        songs.id AS songId,
        songs.title AS songTitle,
        songs.duration AS songDuration,
        songs.file_song AS songFile,
        songs.image AS songImage,
        songs.lyrics AS songLyrics,
        songs.releaseDate AS songReleaseDate,
        songs.is_premium AS songIsPremium,
        songs.listens_count AS songListensCount,
        songs.is_explicit AS songIsExplicit,
        albums.title AS albumTitle,
        albums.id AS albumId
      FROM artists
      LEFT JOIN song_artists ON artists.id = song_artists.artistId
      LEFT JOIN songs ON song_artists.songId = songs.id
      LEFT JOIN song_albums ON songs.id = song_albums.songID
      LEFT JOIN albums ON song_albums.albumID = albums.id
      WHERE artists.id = ?
    `;

    const [rows] = await db.execute(query, [id]);

    if (rows.length === 0) {
      return null; // Không tìm thấy nghệ sĩ
    }

    const artist = {
      id: rows[0].artistId,
      name: rows[0].artistName,
      avatar: rows[0].artistAvatar,
      role: rows[0].artistRole,
      biography: rows[0].artistBiography,
      songs: []
    };

    rows.forEach(row => {
      if (row.songId) {
        artist.songs.push({
          id: row.songId,
          title: row.songTitle,
          duration: row.songDuration,
          file: row.songFile,
          image: row.songImage,
          lyrics: row.songLyrics,
          releaseDate: row.songReleaseDate,
          is_premium: row.songIsPremium,
          listens_count: row.songListensCount,
          is_explicit: row.songIsExplicit,
          albumTitle: row.albumTitle,
          albumId: row.albumId
        });
      }
    });

    return artist;
  }


  static async checkArtistExistsByName(name) {
    const checkQuery = 'SELECT * FROM artists WHERE name = ?';
    const [checkRows] = await db.execute(checkQuery, [name]);
    return checkRows.length > 0;
  }

  static async createArtist(artistData) {
    const { name, avatar = null, role, biography = null } = artistData;
    const query = 'INSERT INTO artists (name, avatar, role, biography) VALUES (?, ?, ?, ?)';
    const [result] = await db.execute(query, [name, avatar, role, biography]);
    return result.insertId;
  }

  static async updateArtist(id, artistData) {
    const { name, avatar, role, biography } = artistData;
    const existingArtist = await db.execute('SELECT * FROM artists WHERE name = ? AND id != ?', [name, id]);
    if (existingArtist[0].length > 0) {
      throw new Error('An artist with this name already exists');
    }

    const query = 'UPDATE artists SET name = ?, avatar = ?, role = ?, biography = ? WHERE id = ?';
    await db.execute(query, [name, avatar, role, biography, id]);
  }

  static async deleteArtist(id) {
    const query = 'DELETE FROM artists WHERE id = ?';
    await db.execute(query, [id]);
  }

  static async searchArtistsByName(name) {
    const query = `SELECT id, name, avatar, role, biography FROM artists WHERE LOWER(name) LIKE ?`;
    const searchName = `%${name.trim().toLowerCase()}%`;
    const [rows] = await db.execute(query, [searchName]);
    return rows;
  }

  static async searchArtists(searchTerm, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      const searchPattern = `${searchTerm}%`;
      
      const query = `
        SELECT 
          a.*,
          COUNT(DISTINCT sa.songID) as totalSongs,
          COUNT(DISTINCT aa.albumID) as totalAlbums,
          COUNT(DISTINCT af.userId) as totalFollowers
        FROM artists a
        LEFT JOIN song_artists sa ON a.id = sa.artistID
        LEFT JOIN album_artists aa ON a.id = aa.artistID
        LEFT JOIN artist_follows af ON a.id = af.artistId
        WHERE LOWER(a.name) LIKE LOWER(${db.escape(searchPattern)})
        GROUP BY a.id
        ORDER BY totalFollowers DESC, totalSongs DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;

      const [rows] = await db.execute(query);
      return rows.map(row => ({
        id: row.id,
        name: row.name,
        avatar: row.avatar,
        totalSongs: row.totalSongs,
        totalAlbums: row.totalAlbums,
        totalFollowers: row.totalFollowers
      }));

    } catch (error) {
      console.error("Lỗi khi tìm kiếm nghệ sĩ:", error);
      throw error;
    }
  }

  static async getArtistCount(searchTerm) {
    try {
      const searchPattern = `${searchTerm}%`;
      const query = `
        SELECT COUNT(DISTINCT id) as count 
        FROM artists 
        WHERE LOWER(name) LIKE LOWER(${db.escape(searchPattern)})
      `;
      
      const [rows] = await db.execute(query);
      return rows[0].count;
    } catch (error) {
      console.error("Lỗi khi đếm số lượng nghệ sĩ:", error);
      throw error;
    }
  }
}

module.exports = ArtistModel;
