const { db } = require("../config/firebase");

class TopRankModel {
    constructor() {
        this.collection = db.collection("topranks");
    }

    /**
     * Hàm lấy tất cả các TopRank từ cơ sở dữ liệu
     * @returns {Promise<Array>}
     */
    async getAllTopRanks() {
        const snapshot = await this.collection.get();

        return snapshot.empty
            ? []
            : snapshot.docs.map((doc) => {
                const rankData = doc.data();
                return {
                    id: doc.id,
                    title: rankData.title,
                    genres: rankData.genres.map((genre) => ({
                        id: genre.id,
                        genre: genre.genre,
                        description: genre.description,
                        popular_artists: genre.popular_artists || [],
                        image: genre.image,
                        title: genre.title,
                        top_100: genre.top_100.map((song) => ({
                            id: song.id,
                            song: song.song,
                            artist: song.artist,
                            image: song.image,
                            time: song.time,
                            album: song.album,
                            likes: song.likes
                        }))
                    }))
                };
            });
    }

    /**
     * Hàm lấy TopRank theo ID từ cơ sở dữ liệu
     * @param {string} id - ID của TopRank cần lấy
     * @returns {Promise<Object|null>} - Bản ghi TopRank tìm thấy hoặc null nếu không tồn tại
     */
    async getTopRankById(id) {
        const rank = await this.collection.doc(id).get();
        if (rank.exists) {
            const rankData = rank.data();
            return {
                id: rank.id,
                title: rankData.title,
                genres: rankData.genres.map((genre) => ({
                    id: genre.id,
                    genre: genre.genre,
                    description: genre.description,
                    popular_artists: genre.popular_artists || [],
                    image: genre.image,
                    title: genre.title,
                    top_100: genre.top_100.map((song) => ({
                        id: song.id,
                        song: song.song,
                        artist: song.artist,
                        image: song.image,
                        time: song.time,
                        album: song.album,
                        likes: song.likes
                    }))
                }))
            };
        }
        return null;
    }

    /**
     * Hàm tạo mới một TopRank
     * @param {string} title - Tiêu đề của danh sách xếp hạng
     * @param {Array<Object>} genres - Danh sách thể loại
     * @returns {Promise<Object>} - Danh sách xếp hạng mới tạo
     */
    async createTopRank(title, genres) {
        const createdAt = new Date();

        const newTopRank = await this.collection.add({
            title,
            genres: genres.map((genre) => ({
                id: genre.id,
                genre: genre.genre,
                description: genre.description,
                popular_artists: genre.popular_artists || [],
                image: genre.image,
                title: genre.title,
                top_100: genre.top_100.map((song) => ({
                    id: song.id,
                    song: song.song,
                    artist: song.artist,
                    image: song.image,
                    time: song.time,
                    album: song.album,
                    likes: song.likes
                }))
            })),
            createdAt,
            updatedAt: createdAt
        });

        return {
            id: newTopRank.id,
            title,
            genres,
            createdAt,
            updatedAt: createdAt
        };
    }

    /**
     * Hàm cập nhật TopRank theo ID
     * @param {string} id - ID của TopRank cần cập nhật
     * @param {Object} updates - Các trường cần cập nhật
     * @returns {Promise<Object>} - TopRank đã được cập nhật
     */
    async updateTopRank(id, updates) {
        const rankRef = this.collection.doc(id);
        const rank = await rankRef.get();

        if (!rank.exists) {
            throw new Error("TopRank not found");
        }

        await rankRef.update({
            ...updates,
            updatedAt: new Date()
        });

        const updatedRankData = rank.data();
        return {
            id: rank.id,
            ...updatedRankData,
            ...updates
        };
    }

    /**
     * Hàm xóa TopRank theo ID
     * @param {string} id - ID của TopRank cần xóa
     * @returns {Promise<string>} - Thông báo xác nhận đã xóa TopRank
     */
    async deleteTopRank(id) {
        const rankRef = this.collection.doc(id);
        const rank = await rankRef.get();

        if (!rank.exists) {
            throw new Error("TopRank not found");
        }

        await rankRef.delete();

        return `TopRank with ID ${id} has been deleted successfully.`;
    }
}

module.exports = new TopRankModel();
