const db = require('../config/db');

class SongModel {

  static async getAllSongs() {
    const query = 'SELECT * FROM songs';
    const [rows] = await db.execute(query);
    return rows;
  }


  static async getSongById(id) {
    const query = 'SELECT * FROM songs WHERE id = ?';
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
      lyrics,
      duration,
      releaseDate,
      is_explicit,
      listens_count = 0 
    } = songData; 
    const checkQuery = 'SELECT * FROM songs WHERE title = ?';
    const [checkRows] = await db.execute(checkQuery, [title]);

    if (checkRows.length > 0) {
      throw new Error('Song with this title already exists');
    }

    const query = 'INSERT INTO songs (title, image, file_song, artistID, albumID, genreID, lyrics, duration, listens_count, releaseDate, is_explicit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

    const [result] = await db.execute(query, [title, image, file_song, artistID, albumID, genreID, lyrics, duration, listens_count, releaseDate, is_explicit]);
    return result.insertId; 
  }

  static async updateSong(id, songData) {
    const {
      title,
      image,
      file_song,
      artistID,
      albumID,
      genreID,
      lyrics,
      duration,
      listens_count, 
      releaseDate,
      is_explicit
    } = songData; 

    const existingSong = await db.execute('SELECT * FROM songs WHERE title = ? AND id != ?', [title, id]);
    if (existingSong[0].length > 0) {
      throw new Error('An Song with this title already exists');
    }

    const query = 'UPDATE songs SET title = ?, image = ?, file_song = ?, artistID = ?, albumID = ?, genreID = ?, lyrics = ?, duration = ?, listens_count = ?, releaseDate = ?, is_explicit = ? WHERE id = ?';
    await db.execute(query, [title, image, file_song, artistID, albumID, genreID, lyrics, duration, listens_count, releaseDate, is_explicit, id]);
  }

  static async deleteSong(id) {
    const query = 'DELETE FROM songs WHERE id = ?';
    await db.execute(query, [id]);
  }
}

module.exports = SongModel;
