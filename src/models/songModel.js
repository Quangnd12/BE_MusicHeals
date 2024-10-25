const { db } = require("../config/firebase");
const { uploadAudio } = require('../middlewares/uploadAudio');
const { uploadImage } = require("../middlewares/uploadMiddleware");

class SongModel {
  constructor() {
    this.collection = db.collection("songs");
  }

  /**
   * Hàm lấy tất cả các bài hát từ cơ sở dữ liệu
   * @returns {Promise<Array<{songId: string, title: string, lyrics: string, duration: number, releasedate: string, is_explicit: boolean, file_song: string|null, image: string|null, playcountId: number, createdAt: object, updatedAt: object, artistIds: string[], albumIds: string[], genreIds: string[]}>>}
   */
  async getAllSongs() {
    const snapshot = await this.collection.get();

    return snapshot.empty
      ? []
      : snapshot.docs.map((doc) => {
        const songData = doc.data();
        return {
          songId: doc.id,
          title: songData.title,
          lyrics: songData.lyrics,
          duration: songData.duration,
          releasedate: songData.releasedate,
          is_explicit: songData.is_explicit,
          file_song: songData.file_song,
          image: songData.image,
          playcountId: songData.playcountId,
          createdAt: songData.createdAt,
          updatedAt: songData.updatedAt,
          artistIds: songData.artistIds || [],
          albumIds: songData.albumIds || [],
          genreIds: songData.genreIds || [],
        };
      });
  }

  /**
   * Hàm lấy bài hát theo ID từ cơ sở dữ liệu
   * @param {string} id - ID của bài hát cần lấy
   * @returns {Promise<{songId: string, title: string, lyrics: string, duration: number, releasedate: string, is_explicit: boolean, file_song: string|null, image: string|null, playcountId: number, createdAt: object, updatedAt: object, artistIds: string[], albumIds: string[], genreIds: string[]} | null>} - Bài hát tìm thấy hoặc null nếu không tồn tại
   */
  async getSongById(id) {
    const song = await this.collection.doc(id).get();
    if (song.exists) {
      const songData = song.data();
      return {
        songId: song.id,
        title: songData.title,
        lyrics: songData.lyrics,
        duration: songData.duration,
        releasedate: songData.releasedate,
        is_explicit: songData.is_explicit,
        file_song: songData.file_song,
        image: songData.image,
        playcountId: songData.playcountId,
        createdAt: songData.createdAt,
        updatedAt: songData.updatedAt,
        artistIds: songData.artistIds || [],
        albumIds: songData.albumIds || [],
        genreIds: songData.genreIds || [],
      };
    }
    return null;
  }

  /**
   * Hàm tạo mới một bài hát
   * @param {string} title - Tên bài hát
   * @param {string} lyrics - Lời bài hát
   * @param {number} duration - Thời gian bài hát
   * @param {string} releasedate - Ngày phát hành
   * @param {boolean} is_explicit - Có chứa nội dung nhạy cảm hay không
   * @param {string|null} file_song - Đường dẫn đến file âm thanh
   * @param {string|null} image - Đường dẫn đến hình ảnh
   * @param {Array<string>} artistIds - Danh sách ID nghệ sĩ
   * @param {Array<string>} albumIds - Danh sách ID album
   * @param {Array<string>} genreIds - Danh sách ID thể loại
   * @returns {Promise<{songId: string, title: string, lyrics: string, duration: number, releasedate: string, is_explicit: boolean, file_song: string|null, image: string|null, playcountId: number, createdAt: object, updatedAt: object, artistIds: string[], albumIds: string[], genreIds: string[]}>} - Bài hát mới tạo
   */
   async createSong(title, lyrics, duration, releasedate, is_explicit, file_song, image, artistIds = [], albumIds = [], genreIds = []) {
    try {
      const existing = await this.collection.where('title', '==', title).get();
      if (!existing.empty) {
        throw new Error("song name already exists.");
      }

      const uploadedImage = await uploadImage(image);
      const uploadedFileSong = await uploadAudio(file_song);
      
      const createdAt = new Date();
      const newSong = await this.collection.add({
        title,
        lyrics,
        duration,
        releasedate,
        is_explicit,
        file_song: uploadedFileSong,
        image: uploadedImage,
        playcountId: 0,
        artistIds,
        albumIds,
        genreIds,
        createdAt,
        updatedAt: createdAt,
      });
  
      return {
        songId: newSong.id,
        title,
        lyrics,
        duration,
        releasedate,
        is_explicit,
        file_song: uploadedFileSong,
        image: uploadedImage,
        playcountId: 0,
        createdAt,
        updatedAt: createdAt,
        artistIds,
        albumIds,
        genreIds,
      };
    } catch (error) {
      console.error("Error creating song:", error);
      throw new Error("Failed to create song");
    }
  }
  

  /**
   * Hàm cập nhật bài hát theo ID
   * @param {string} id - ID của bài hát cần cập nhật
   * @param {Object} updates - Các trường cần cập nhật
   * @returns {Promise<{songId: string, title: string, lyrics: string, duration: number, releasedate: string, is_explicit: boolean, file_song: string|null, image: string|null, playcountId: number, createdAt: object, updatedAt: object, artistIds: string[], albumIds: string[], genreIds: string[]}>} - Bài hát đã được cập nhật
   */
  async updateSong(id, updates) {
    const songRef = this.collection.doc(id);
    const song = await songRef.get();

    if (!song.exists) {
      throw new Error("Song not found");
    }

    // Cập nhật các thông tin mới cho bài hát
    await songRef.update({
      ...updates,
      updatedAt: new Date(),
    });

    const updatedSongData = {
      songId: song.id,
      title: updates.title || song.data().title,
      lyrics: updates.lyrics || song.data().lyrics,
      duration: updates.duration || song.data().duration,
      releasedate: updates.releasedate || song.data().releasedate,
      is_explicit: updates.is_explicit || song.data().is_explicit,
      file_song: updates.file_song || song.data().file_song,
      image: updates.image || song.data().image,
      playcountId: song.data().playcountId,
      createdAt: song.data().createdAt,
      updatedAt: { _seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0 },
      artistIds: updates.artistIds || song.data().artistIds || [],
      albumIds: updates.albumIds || song.data().albumIds || [],
      genreIds: updates.genreIds || song.data().genreIds || [],
    };

    return updatedSongData;
  }

  /**
 * Hàm xóa bài hát theo ID
 * @param {string} id - ID của bài hát cần xóa
 * @returns {Promise<string>} - Thông báo xác nhận đã xóa bài hát
 */
async deleteSong(id) {
  const songRef = this.collection.doc(id);
  const song = await songRef.get();

  if (!song.exists) {
    throw new Error("Song not found");
  }

  // Xóa bài hát
  await songRef.delete();
  
  return `Song with ID ${id} has been deleted successfully.`;
}

}

module.exports =new SongModel();
