const { db } = require("../config/firebase");
const { uploadImage } = require('../middlewares/uploadMiddleware');


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
    let imageUrl = image;

    const existingGenre = await this.collection.where('name', '==', name).get();
    if (!existingGenre.empty) {
      throw new Error("Genre name already exists.");
    }
    // Nếu có ảnh, upload ảnh lên Firebase Storage
    if (image !== "No description provided") {
      imageUrl = await uploadImage(image);
    }

    // Tạo genre mới trong Firestore
    const newGenre = await this.collection.add({
      name,
      description,
      image: imageUrl,
    });

    const subgenresWithIds = [];
    const subgenresCollection = newGenre.collection('subgenres');

    // Nếu có subgenres, thêm vào database
    if (subgenres.length > 0) {
      for (const subgenre of subgenres) {
        const subgenreDoc = await subgenresCollection.add({
          name: subgenre,
        });
        subgenresWithIds.push({
          id: subgenreDoc.id,  // Firebase tự động tạo ID
          name: subgenre,
        });
      }
    }

    // Cập nhật lại genre với subgenres nếu có
    await newGenre.update({
      subgenres: subgenresWithIds,
    });

    // Trả về genre với các thông tin đầy đủ
    return {
      id: newGenre.id,
      name,
      description,
      image: imageUrl,
      subgenres: subgenresWithIds,
    };
  }




  /**
   * Hàm cập nhật thể loại theo ID
   * @param {string} id - ID của thể loại cần cập nhật
   * @param {string} [name] - Tên thể loại mới (nếu có)
   * @param {string} [description] - Mô tả thể loại mới (nếu có)
   * @param {string} [image] - Hình ảnh thể loại mới (nếu có)
   * @param {Array<string>} [subgenres] - Danh sách các thể loại con mới (nếu có)
   * @returns {Promise<{id: string, name: string, description: string, image: string, subgenres: Array<{id: string, name: string}>}>} - Thể loại đã được cập nhật
   */
  async updateGenre(id, name, description, image, subgenres) {
    const genreRef = this.collection.doc(id);
    const genre = await genreRef.get();

    if (!genre.exists) {
      throw new Error("Genre not found");
    }
    if (name && name !== genre.data().name) {
      const existingGenre = await this.collection.where('name', '==', name).get();
      if (!existingGenre.empty) {
        throw new Error("Genre name already exists.");
      }
    }
    let imageUrl = image || genre.data().image; // Giữ nguyên hình ảnh cũ nếu không có hình ảnh mới

    // Nếu có hình ảnh mới, upload hình ảnh mới
    if (image && image !== genre.data().image) {
      imageUrl = await uploadImage(image);
    }

    // Cập nhật các thông tin mới cho genre
    await genreRef.update({
      name: name || genre.data().name,  // Nếu không có name mới thì giữ nguyên tên cũ
      description: description || genre.data().description,  // Giữ nguyên mô tả cũ nếu không có mô tả mới
      image: imageUrl,
    });

    // Cập nhật subgenres nếu có thay đổi
    let subgenresWithIds = [];
    if (subgenres) {
      const subgenresCollection = genreRef.collection('subgenres');

      // Xóa các subgenres không còn trong danh sách mới
      const existingSubgenres = await subgenresCollection.get();
      const existingSubgenreIds = existingSubgenres.docs.map(doc => doc.id);

      // Xóa các subgenres cũ không còn trong subgenres mới
      for (const subgenreDoc of existingSubgenres.docs) {
        if (!subgenres.includes(subgenreDoc.data().name)) {
          await subgenreDoc.ref.delete();
        }
      }

      // Thêm các subgenres mới hoặc cập nhật subgenres đã có
      for (const subgenre of subgenres) {
        const existingSubgenreDoc = existingSubgenres.docs.find(
          doc => doc.data().name === subgenre
        );

        if (existingSubgenreDoc) {
          // Nếu subgenre đã tồn tại, giữ nguyên ID của nó
          subgenresWithIds.push({
            id: existingSubgenreDoc.id,
            name: subgenre,
          });
        } else {
          // Nếu subgenre mới, thêm vào Firestore
          const subgenreDoc = await subgenresCollection.add({
            name: subgenre,
          });
          subgenresWithIds.push({
            id: subgenreDoc.id,
            name: subgenre,
          });
        }
      }
    } else {
      subgenresWithIds = genre.data().subgenres || [];
    }

    // Cập nhật lại genre với các subgenres mới nếu có
    await genreRef.update({
      subgenres: subgenresWithIds,
    });

    // Trả về genre đã được cập nhật
    return {
      id: genre.id,
      name: name || genre.data().name,
      description: description || genre.data().description,
      image: imageUrl,
      subgenres: subgenresWithIds,
    };
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

    await genreRef.delete();
  }

  /**
   * Hàm xóa nhiều thể loại (theo danh sách id)
   * @param {Array<string>} genreIds - Mảng chứa các id của các thể loại cần xóa
   * @returns {Promise<number>} - Số lượng thể loại đã xóa
   */
  async deleteGenresAll(genreIds) {
    try {
      let deletedCount = 0;

      // Duyệt qua từng ID trong danh sách genreIds và thực hiện xóa
      for (const id of genreIds) {
        console.log(`Checking for genre with id: ${id}`);  // Log id để kiểm tra

        const genreRef = GenreModel.collection.doc(id); // Lấy reference của document theo ID
        const genreDoc = await genreRef.get();  // Lấy dữ liệu của genre theo ID

        // Nếu document không tồn tại, log thông báo và bỏ qua
        if (!genreDoc.exists) {
          console.log(`Genre with id ${id} not found.`);  // Log nếu genre không tồn tại
          continue;
        }

        // Xóa document genre theo ID
        await genreRef.delete();
        deletedCount++;  // Tăng biến đếm số lượng genre đã xóa
        console.log(`Genre with id ${id} deleted successfully.`);
      }

      return deletedCount;  // Trả về số lượng genre đã xóa
    } catch (error) {
      throw new Error('Error deleting genres: ' + error.message);  // Log và ném lỗi nếu có
    }
  }




}

module.exports = new GenreModel();
