const db = require('../config/db');

class HistorySongModel {

    // Lấy toàn bộ lịch sử nghe nhạc
    static async getAllHistory() {
        let query = `
    SELECT 
    histories.id,
    users.username,
    users.id AS userID,
    songs.id AS songID,
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
    GROUP_CONCAT(DISTINCT countries.name SEPARATOR ', ') AS country,
    histories.listeningDate
FROM histories
JOIN users 
    ON histories.userID = users.id
JOIN songs 
    ON histories.songID = songs.id
LEFT JOIN song_artists 
    ON songs.id = song_artists.songId
LEFT JOIN artists 
    ON song_artists.artistId = artists.id
LEFT JOIN song_albums 
    ON songs.id = song_albums.songID
LEFT JOIN albums 
    ON song_albums.albumID = albums.id
LEFT JOIN song_genres 
    ON songs.id = song_genres.songID
LEFT JOIN genres 
    ON song_genres.genreID = genres.id
LEFT JOIN countries 
    ON genres.countryID = countries.id
WHERE histories.deleted_at IS NULL
GROUP BY histories.id
    `;
        const [rows] = await db.execute(query);
        return rows;
    }

    static async getHistoryById(id) {
        const query = `
    SELECT 
    histories.id,
    users.username,
    users.id AS userId,
    songs.id AS songId,
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
    GROUP_CONCAT(DISTINCT countries.name SEPARATOR ', ') AS country,
    histories.listeningDate
FROM histories
JOIN users 
    ON histories.userID = users.id
JOIN songs 
    ON histories.songID = songs.id
LEFT JOIN song_artists 
    ON songs.id = song_artists.songId
LEFT JOIN artists 
    ON song_artists.artistId = artists.id
LEFT JOIN song_albums 
    ON songs.id = song_albums.songID
LEFT JOIN albums 
    ON song_albums.albumID = albums.id
LEFT JOIN song_genres 
    ON songs.id = song_genres.songID
LEFT JOIN genres 
    ON song_genres.genreID = genres.id
LEFT JOIN countries 
    ON genres.countryID = countries.id
WHERE histories.userID = ? 
AND histories.deleted_at IS NULL
GROUP BY  
histories.id, 
songs.id, 
users.id, 
histories.listeningDate`;
        const [rows] = await db.execute(query, [id]);
        return rows;
    }

    static async createHistory(historyData) {
        const { userID, songID } = historyData;
        if (!userID || !songID) {
          throw new Error('userID và songID không được để trống');
        }
      
        const query = "INSERT INTO histories (userID, songID, listeningDate) VALUES (?, ?, NOW())";
        const [result] = await db.execute(query, [userID, songID]);
        return result;
      }

    static async softDeleteHistory(historyId) {
        if (!historyId) {
            throw new Error('ID lịch sử không được để trống');
        }

        const query = `
            UPDATE histories 
            SET deleted_at = NOW() 
            WHERE id = ? AND deleted_at IS NULL
        `;
        
        const [result] = await db.execute(query, [historyId]);
        
        if (result.affectedRows === 0) {
            throw new Error('Không tìm thấy lịch sử nghe hoặc đã bị xóa');
        }
        
        return result;
    }

    static async softDeleteAllHistory(userId) {
        if (!userId) {
            throw new Error('ID người dùng không được để trống');
        }

        const query = `
            UPDATE histories 
            SET deleted_at = NOW() 
            WHERE userID = ? AND deleted_at IS NULL
        `;
        
        const [result] = await db.execute(query, [userId]);
        
        if (result.affectedRows === 0) {
            throw new Error('Không tìm thấy lịch sử nghe hoặc đã bị xóa');
        }
        
        return result;
    }

    static async checkExistingHistory(userID, songID) {
        const query = `
            SELECT id 
            FROM histories 
            WHERE userID = ? 
            AND songID = ? 
            AND deleted_at IS NULL
            LIMIT 1
        `;
        
        const [rows] = await db.execute(query, [userID, songID]);
        return rows.length > 0;
    }
}

module.exports = HistorySongModel;
