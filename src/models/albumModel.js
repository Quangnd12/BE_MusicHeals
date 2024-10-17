const { db } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");

class AlbumModel {
  constructor() {
    this.collection = db.collection("albums");
  }

  /**
   * Hàm lấy tất cả các album từ cơ sở dữ liệu
   * @returns {Promise<Array<{
   *   albumId: string, 
   *   title: string, 
   *   image: string, 
   *   artistId: number, 
   *   songId: number, 
   *   describe: string, 
   *   totalTracks: number, 
   *   popularity: number, 
   *   releasedate: string
   * }>>} - Trả về danh sách album dưới dạng Promise.
   */
  async getAllAlbums() {
    const snapshot = await this.collection.get();

    return snapshot.empty
      ? []
      : snapshot.docs.map((doc) => {
        const albumData = doc.data();
        return {
          albumId: doc.id,
          title: albumData.title,
          image: albumData.image,
          artistId: albumData.artistId,
          songId: albumData.songId,
          describe: albumData.describe,
          totalTracks: albumData.totalTracks,
          popularity: albumData.popularity,
          releasedate: albumData.releasedate,
        };
      });
  }

  /**
   * Hàm lấy album theo ID từ cơ sở dữ liệu
   * @param {string} id - ID của album cần lấy
   * @returns {Promise<{
   *   albumId: string, 
   *   title: string, 
   *   image: string, 
   *   artistId: number, 
   *   songId: number, 
   *   describe: string, 
   *   totalTracks: number, 
   *   popularity: number, 
   *   releasedate: string
   * } | null>} 
   */
  async getAlbumById(id) {
    const album = await this.collection.doc(id).get();
    if (album.exists) {
      const albumData = album.data();
      return {
        albumId: album.id,
        title: albumData.title,
        image: albumData.image,
        artistId: albumData.artistId,
        songId: albumData.songId,
        describe: albumData.describe,
        totalTracks: albumData.totalTracks,
        popularity: albumData.popularity,
        releasedate: albumData.releasedate,
      };
    }
    return null;
  }

  /**
   * Hàm tạo mới một album với các tham số
   * @param {string} title - Tiêu đề album
   * @param {string} image - Hình ảnh album
   * @param {number} artistId - ID của nghệ sĩ thực hiện album
   * @param {number} songId - ID của bài hát trong album
   * @param {string} describe - Mô tả album
   * @param {number} totalTracks - Tổng số bài hát trong album
   * @param {number} popularity - Độ phổ biến của album
   * @param {string} releasedate - Ngày phát hành album
   * @returns {Promise<{
   *   albumId: string, 
   *   title: string, 
   *   image: string, 
   *   artistId: number, 
   *   songId: number, 
   *   describe: string, 
   *   totalTracks: number, 
   *   popularity: number, 
   *   releasedate: string
   * }>} - Album mới tạo
   */
  async createAlbum(title, image, artistId, songId, describe, totalTracks, popularity, releasedate) {
    const newAlbum = await this.collection.add({
      title,
      image,
      artistId,
      songId,
      describe,
      totalTracks,
      popularity,
      releasedate,
    });

    return {
      albumId: newAlbum.id,
      title,
      image,
      artistId,
      songId,
      describe,
      totalTracks,
      popularity,
      releasedate,
    };
  }

  /**
   * Hàm cập nhật thông tin của một album
   * @param {string} id - ID của album cần cập nhật
   * @param {object} data - Dữ liệu cập nhật, bao gồm title, image, artistId, songId, describe, genreId, totalTracks, popularity, và releasedate
   * @returns {Promise<{
   *   albumId: string, 
   *   title: string, 
   *   image: string, 
   *   artistId: number, 
   *   songId: number, 
   *   describe: string, 
   *   totalTracks: number, 
   *   popularity: number, 
   *   releasedate: string
   * }>} - Album sau khi cập nhật
   */
  async updateAlbum(id, data) {
    const albumRef = this.collection.doc(id);
    const albumDoc = await albumRef.get();
    if (!albumDoc.exists) {
      throw new Error("Album not found.");
    }

    // Cập nhật album
    await albumRef.update(data);
    return { albumId: id, ...data };
  }

  /**
   * Hàm xóa album
   * @param {string} id - ID của album cần xóa
   * @returns {Promise<void>} - Không trả về dữ liệu
   */
  async deleteAlbum(id) {
    const albumRef = this.collection.doc(id);
    const albumDoc = await albumRef.get();
    if (!albumDoc.exists) {
      throw new Error("Album not found.");
    }

    // Xóa album
    await albumRef.delete();
  }
}

module.exports = new AlbumModel();
