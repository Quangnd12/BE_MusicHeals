const db = require('../config/db');
const lyricsFinder = require('lyrics-finder');

class SongModel {

  static async getAllSongs(pagination = false, page, limit, searchName, genres = [], minDuration = 0, maxDuration = 0, minListensCount = 0,maxListensCount = 0) {
    let query = `
      SELECT 
        songs.id,
        songs.title,
        songs.image,
        songs.file_song,
        songs.lyrics,
        songs.duration,
        songs.listens_count,
        songs.releaseDate,
        songs.is_explicit,
        GROUP_CONCAT(DISTINCT artists.name SEPARATOR ', ') AS artist,
        GROUP_CONCAT(DISTINCT albums.title SEPARATOR ', ') AS album,
        GROUP_CONCAT(DISTINCT genres.name SEPARATOR ', ') AS genre,
        GROUP_CONCAT(DISTINCT artists.id SEPARATOR ', ') AS artistID,
        GROUP_CONCAT(DISTINCT albums.id SEPARATOR ', ') AS albumID,
        GROUP_CONCAT(DISTINCT genres.id SEPARATOR ', ') AS genreID,
        GROUP_CONCAT(DISTINCT countries.name SEPARATOR ', ') AS country
      FROM songs
      LEFT JOIN song_artists ON songs.id = song_artists.songId
      LEFT JOIN artists ON song_artists.artistId = artists.id
      LEFT JOIN song_albums ON songs.id = song_albums.songID
      LEFT JOIN albums ON song_albums.albumID = albums.id
      LEFT JOIN song_genres ON songs.id = song_genres.songID
      LEFT JOIN genres ON song_genres.genreID = genres.id
      LEFT JOIN countries ON genres.countryID = countries.id
    `;

    const conditions = [];

    if (searchName) {
      conditions.push(`songs.title LIKE ?`);
    }

    if (genres.length > 0) {
      conditions.push(`song_genres.genreID IN (${genres.join(', ')})`);
    }

    if (minDuration > 0 && maxDuration > 0) {
      conditions.push(`songs.duration BETWEEN ? AND ?`);
    }

    if (minListensCount > 0 && maxListensCount>0) {
      conditions.push(`songs.listens_count BETWEEN ? AND ?`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` GROUP BY songs.id`;

    if (pagination) {
      const offset = (page - 1) * limit;
      query += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    const params = [];
    if (searchName) params.push(`%${searchName}%`);
    if (genres.length > 0) params.push(...genres);
    if (minDuration > 0 && maxDuration > 0) params.push(minDuration, maxDuration);
    if (minListensCount > 0 && maxListensCount>0) params.push(minListensCount,maxListensCount);

    const [rows] = await db.execute(query, params);
    return rows;
}

  static async getSongCount() {
    const query = 'SELECT COUNT(*) as count FROM songs';
    const [rows] = await db.execute(query);
    return rows[0].count;
  }


  static async getSongById(id) {
    const query = `SELECT 
    songs.id,
    songs.title,
    songs.image,
    songs.file_song,
    songs.lyrics,
    songs.duration,
    songs.listens_count,
    songs.releaseDate,
    songs.is_explicit,
    GROUP_CONCAT(DISTINCT artists.name SEPARATOR ', ') AS artist,
    GROUP_CONCAT(DISTINCT albums.title SEPARATOR ', ') AS album,
    GROUP_CONCAT(DISTINCT genres.name SEPARATOR ', ') AS genre,
    GROUP_CONCAT(DISTINCT artists.id SEPARATOR ', ') AS artistID,
    GROUP_CONCAT(DISTINCT albums.id SEPARATOR ', ') AS albumID,
    GROUP_CONCAT(DISTINCT genres.id SEPARATOR ', ') AS genreID,
    GROUP_CONCAT(DISTINCT countries.name SEPARATOR ', ') AS country
  FROM songs
  LEFT JOIN song_artists ON songs.id = song_artists.songId
  LEFT JOIN artists ON song_artists.artistId = artists.id
  LEFT JOIN song_albums ON songs.id = song_albums.songID
  LEFT JOIN albums ON song_albums.albumID = albums.id
  LEFT JOIN song_genres ON songs.id = song_genres.songID
  LEFT JOIN genres ON song_genres.genreID = genres.id
  LEFT JOIN countries ON genres.countryID = countries.id
  WHERE songs.id = ?
  GROUP BY songs.id`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
  }

  static async createSong(songData) {
    const {
      title,
      image,
      file_song,
      artistID,
      albumID = null,
      genreID,
      duration,
      releaseDate,
      is_explicit,
      listens_count = 0,

    } = songData;

    
    const lyrics = await lyricsFinder(artistID, title) || "Not Found!";
    // Thêm bài hát vào bảng songs
    const query = 'INSERT INTO songs (title, image, file_song, lyrics, duration, listens_count, releaseDate, is_explicit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    const [result] = await db.execute(query, [title, image, file_song, lyrics, duration, listens_count, releaseDate, is_explicit]);
    const songId = result.insertId;

    if (artistID && artistID.length > 0) {
      await this.insertArtists(songId, artistID);
    }
    if (genreID && genreID.length > 0) {
      await this.insertGenres(songId, genreID);
    }
    if (albumID && albumID.length > 0) {
      await this.insertAlbums(songId, albumID);
    }

    return songId;
  }

  static async insertArtists(songId, artistIDs) {
    if (artistIDs && artistIDs.length > 0) {
      const artistQueries = artistIDs.map(id => db.execute('INSERT INTO song_artists (songID, artistID) VALUES (?, ?)', [songId, id]));
      await Promise.all(artistQueries);
    }
  }

  static async insertAlbums(songId, albumIDs) {
    if (albumIDs && albumIDs.length > 0) {
      const albumQueries = albumIDs.map(id => db.execute('INSERT INTO song_albums (songID, albumID) VALUES (?, ?)', [songId, id]));
      await Promise.all(albumQueries);
    }
  }

  static async insertGenres(songId, genreIDs) {
    if (genreIDs && genreIDs.length > 0) {
      const genreQueries = genreIDs.map(id => db.execute('INSERT INTO song_genres (songID, genreID) VALUES (?, ?)', [songId, id]));
      await Promise.all(genreQueries);
    }
  }

  static async deleteSongAssociations(songId) {
    await db.execute('DELETE FROM song_artists WHERE songID = ?', [songId]);
    await db.execute('DELETE FROM song_albums WHERE songID = ?', [songId]);
    await db.execute('DELETE FROM song_genres WHERE songID = ?', [songId]);
  }

  static async deleteAlbumAssociations(songId) {
    await db.execute('DELETE FROM song_albums WHERE songID = ?', [songId]);
  }

  static async deleteArtistAssociations(songId) {
    await db.execute('DELETE FROM song_artists WHERE songID = ?', [songId]);
  }

  static async deleteGenreAssociations(songId) {
    await db.execute('DELETE FROM song_genres WHERE songID = ?', [songId]);
  }

  static async getArtistAssociations(songId) {
    const [rows] = await db.execute('SELECT * FROM song_artists WHERE songID = ?', [songId]);
    return rows;
  }
  static async getAlbumAssociations(songId) {
    const [rows] = await db.execute('SELECT * FROM song_albums WHERE songID = ?', [songId]);
    return rows;
  }
  static async getGenreAssociations(songId) {
    const [rows] = await db.execute('SELECT * FROM song_genres WHERE songID = ?', [songId]);
    return rows;
  }


  static async updateSong(id, songData) {
    const {
      title,
      image,
      file_song,
      lyrics,
      duration,
      listens_count,
      releaseDate,
      is_explicit,
      artistID,
      albumID,
      genreID
    } = songData;

  

    // Cập nhật thông tin bài hát, giữ nguyên file cũ nếu không có file mới
    const updatedImage = image || existingSong[0].image;
    const updatedFileSong = file_song || existingSong[0].file_song;
    const query = `UPDATE songs 
                   SET title = ?, image = ?, file_song = ?, lyrics = ?, duration = ?, listens_count = ?, releaseDate = ?, is_explicit = ? 
                   WHERE id = ?`;
    await db.execute(query, [title, updatedImage, updatedFileSong, lyrics, duration, listens_count, releaseDate, is_explicit, id]);

    // Cập nhật các quan hệ nếu có ID mới
    if (artistID && artistID.length > 0) {
      await this.deleteArtistAssociations(id);
      await this.insertArtists(id, artistID);
    }

    if (albumID && albumID.length > 0) {
      await this.deleteAlbumAssociations(id);
      await this.insertAlbums(id, albumID);
    }

    if (genreID && genreID.length > 0) {
      await this.deleteGenreAssociations(id);
      await this.insertGenres(id, genreID);
    }

    return { message: "Song updated successfully" };
  }


  static async deleteSong(id) {
    await this.deleteSongAssociations(id);
    await db.execute('DELETE FROM songs WHERE id = ?', [id]);
  }
}

module.exports = SongModel;
