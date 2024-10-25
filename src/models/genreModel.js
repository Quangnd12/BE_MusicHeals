const { db } = require("../config/firebase");

class GenreModel {
  constructor() {
    this.collection = db.collection("genres");
  }

  /**
   * Hàm lấy tất cả các thể loại từ cơ sở dữ liệu
   * @returns {Promise<Array<{id: string, name: string, description: string, image: string, subgenres: Array<{id: string, name: string}>}>>} 
   */
  async getAllGenres() {
    const snapshot = await this.collection.get();

    return snapshot.empty
      ? []
      : snapshot.docs.map((doc) => {
          const genreData = doc.data();
          return {
            id: doc.id,
            name: genreData.name,
            description: genreData.description,
            image: genreData.image,
            subgenres: genreData.subgenres || [], 
          };
        });
  }

  /**
   * Hàm lấy thể loại theo ID từ cơ sở dữ liệu
   * @param {string} id - ID của thể loại cần lấy
   * @returns {Promise<{id: string, name: string, description: string, image: string, subgenres: Array<{id: string, name: string}>} | null>} - Thể loại tìm thấy hoặc null nếu không tồn tại
   */
  async getGenreById(id) {
    const genre = await this.collection.doc(id).get();
    if (genre.exists) {
      const genreData = genre.data();
      return {
        id: genre.id,
        name: genreData.name,
        description: genreData.description,
        image: genreData.image,
        subgenres: genreData.subgenres || [], // Cấu trúc subgenres nếu có
      };
    }
    return null;
  }

  /**
   * Hàm tạo mới một thể loại với các tham số, bao gồm cả subgenres
   * @param {string} name - Tên thể loại
   * @param {string} description - Mô tả thể loại
   * @param {string} [image="No description provided"] - Hình ảnh thể loại, mặc định là "No description provided"
   * @param {Array<string>} [subgenres=[]] - Danh sách các thể loại con (subgenres) dưới dạng mảng chuỗi, mặc định là mảng rỗng
   * @returns {Promise<{id: string, name: string, description: string, image: string, subgenres: Array<{id: string, name: string}>}>} - Thể loại mới tạo
   */
   async createGenre(name, description, image = "No description provided", subgenres = []) {
    // Tạo genre mới trước
    const newGenre = await this.collection.add({
      name,
      description,
      image,
    });
  
    // Thêm subgenres vào collection phụ của genre
    const subgenresWithIds = [];
    const subgenresCollection = newGenre.collection('subgenres');
  
    for (const subgenre of subgenres) {
      const subgenreDoc = await subgenresCollection.add({
        name: subgenre,
      });
      subgenresWithIds.push({
        id: subgenreDoc.id,  // Firebase sẽ tự động tạo ID
        name: subgenre,
      });
    }
  
    // Cập nhật thể loại với subgenres
    await newGenre.update({
      subgenres: subgenresWithIds,  // Cập nhật lại genre với các subgenres đã có ID
    });
  
    return {
      id: newGenre.id,
      name,
      description,
      image,
      subgenres: subgenresWithIds,
    };
  }

/**
 * Hàm cập nhật thông tin của một thể loại
 * @param {string} id - ID của thể loại cần cập nhật
 * @param {object} data - Dữ liệu cập nhật, bao gồm name, description, image, và subgenres (nếu cần cập nhật)
 * @returns {Promise<{id: string, name: string, description: string, image: string, subgenres: Array<{id: string, name: string}>}>} - Thể loại sau khi cập nhật
 */
 async updateGenre(id, data) {
  const genreRef = this.collection.doc(id);
  const genreDoc = await genreRef.get();

  if (!genreDoc.exists) {
    throw new Error("Genre not found.");
  }

  const genreData = genreDoc.data();

  // Xử lý subgenres
  const existingSubgenres = genreData.subgenres || [];
  
  const updatedSubgenres = data.subgenres
    ? data.subgenres.map((subgenre, index) => ({
        id: existingSubgenres[index] ? existingSubgenres[index].id : null, // Giữ id nếu có
        name: subgenre.name || subgenre, // Trường hợp chuỗi thì dùng trực tiếp
      }))
    : existingSubgenres;

  const updatedData = {
    ...genreData,
    ...data,
    subgenres: updatedSubgenres,
  };

  await genreRef.update(updatedData);

  return { id, ...updatedData };
}


  /**
   * Hàm xóa thể loại
   * @param {string} id - ID của thể loại cần xóa
   * @returns {Promise<void>} - Không trả về dữ liệu
   */
  async deleteGenre(id) {
    const genreRef = this.collection.doc(id);
    const genreDoc = await genreRef.get();
    if (!genreDoc.exists) {
      throw new Error("Genre not found.");
    }

    // Xóa thể loại và các subgenres liên quan nếu cần
    await genreRef.delete();
  }
}

module.exports = new GenreModel();
