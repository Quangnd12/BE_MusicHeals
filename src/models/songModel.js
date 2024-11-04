const db = require('../config/db');
const lyricsFinder = require('lyrics-finder');

class SongModel {

  static async getAllSongs(page = 1, limit = 10) {
    const offset = (page - 1) * limit; 
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
      GROUP_CONCAT(DISTINCT countries.name SEPARATOR ', ') AS country
    FROM songs
    LEFT JOIN song_artists ON songs.id = song_artists.songId
    LEFT JOIN artists ON song_artists.artistId = artists.id
    LEFT JOIN song_albums ON songs.id = song_albums.songID
    LEFT JOIN albums ON song_albums.albumID = albums.id
    LEFT JOIN song_genres ON songs.id = song_genres.songID
    LEFT JOIN genres ON song_genres.genreID = genres.id
    LEFT JOIN countries ON genres.countryID = countries.id
    GROUP BY songs.id
    LIMIT ${limit} OFFSET ${offset}`; 

    const [rows] = await db.execute(query); 
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
      albumID,
      genreID,
      duration,
      releaseDate,
      is_explicit,
      listens_count = 0,

    } = songData;

    const checkQuery = 'SELECT * FROM songs WHERE title = ?';
    const [checkRows] = await db.execute(checkQuery, [title]);

    if (checkRows.length > 0) {
      throw new Error('Song with this title already exists');
    }
    const lyrics = await lyricsFinder(artistID, title) || "Not Found!";
    // Thêm bài hát vào bảng songs
    const query = 'INSERT INTO songs (title, image, file_song, lyrics, duration, listens_count, releaseDate, is_explicit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    const [result] = await db.execute(query, [title, image, file_song, lyrics, duration, listens_count, releaseDate, is_explicit]);
    const songId = result.insertId;

    // Thêm mối quan hệ nghệ sĩ, album, thể loại
    await this.insertArtists(songId, artistID);
    await this.insertAlbums(songId, albumID);
    await this.insertGenres(songId, genreID);

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

    // Kiểm tra nếu bài hát với tiêu đề tương tự đã tồn tại
    const existingSongQuery = 'SELECT * FROM songs WHERE id = ?';
    const [existingSong] = await db.execute(existingSongQuery, [id]);
    if (existingSong.length === 0) {
      throw new Error('Song not found');
    }

    if (title && existingSong[0].title !== title) {
      const checkTitleQuery = 'SELECT * FROM songs WHERE title = ? AND id != ?';
      const [checkTitle] = await db.execute(checkTitleQuery, [title, id]);
      if (checkTitle.length > 0) {
        throw new Error('A song with this title already exists');
      }
    }

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
