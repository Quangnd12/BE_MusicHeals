const { db } = require("../config/firebase");

class FavoriteModel {
  constructor() {
    this.collection = db.collection("favorites"); // Collection trong Firestore
  }

  /**
   * Hàm lấy tất cả các favorite của người dùng từ cơ sở dữ liệu
   * @returns {Promise<Array<{favoriteId: string, userId: number, songId: number, albumId: number, playlistId: number, created: string}>>} - Trả về danh sách các favorite của người dùng.
   */
  async getUserFavorites() {
    const snapshot = await this.collection.get();

    return snapshot.empty
      ? []
      : snapshot.docs.map((doc) => {
          const favoriteData = doc.data();
          return {
            favoriteId: doc.id,
            userId: favoriteData.userId,
            songId: favoriteData.songId,
            albumId: favoriteData.albumId,
            playlistId: favoriteData.playlistId,
            created: favoriteData.created,
          };
        });
  }

  /**
   * Hàm lấy một favorite theo ID
   * @param {string} favoriteId - ID của favorite
   * @returns {Promise<{favoriteId: string, userId: number, songId: number, albumId: number, playlistId: number, created: string}>} - Trả về favorite tìm thấy.
   */
  async getFavoriteById(favoriteId) {
    const favoriteRef = this.collection.doc(favoriteId);
    const favoriteDoc = await favoriteRef.get();

    if (!favoriteDoc.exists) {
      throw new Error("Favorite not found.");
    }

    const favoriteData = favoriteDoc.data();
    return {
      favoriteId: favoriteDoc.id,
      userId: favoriteData.userId,
      songId: favoriteData.songId,
      albumId: favoriteData.albumId,
      playlistId: favoriteData.playlistId,
      created: favoriteData.created,
    };
  }

  /**
   * Hàm thêm một favorite mới vào cơ sở dữ liệu
   * @param {string} userId - ID của người dùng
   * @param {number} songId - ID của bài hát (nếu có)
   * @param {number} albumId - ID của album (nếu có)
   * @param {number} playlistId - ID của playlist (nếu có)
   * @returns {Promise<{favoriteId: string, userId: number, songId: number, albumId: number, playlistId: number, created: string}>} - Favorite mới tạo.
   */
  async createFavorite(userId, songId, albumId, playlistId) {
    const newFavorite = await this.collection.add({
      userId,
      songId,
      albumId,
      playlistId,
      created: new Date(),
    });

    return {
      favoriteId: newFavorite.id,
      userId,
      songId,
      albumId,
      playlistId,
      created: new Date(),
    };
  }

  /**
   * Hàm xóa một favorite theo ID
   * @param {string} favoriteId - ID của favorite cần xóa
   * @returns {Promise<void>} - Không trả về dữ liệu
   */
  async deleteFavorite(favoriteId) {
    const favoriteRef = this.collection.doc(favoriteId);
    const favoriteDoc = await favoriteRef.get();
    if (!favoriteDoc.exists) {
      throw new Error("Favorite not found.");
    }

    // Xóa favorite
    await favoriteRef.delete();
  }
}

module.exports = new FavoriteModel();
