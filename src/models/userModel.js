const { db, storage } = require("../config/firebase");
const bcrypt = require("bcryptjs");
const sharp = require('sharp'); // Sử dụng thư viện sharp để nén ảnh
const crypto = require('crypto');

class UserModel {
  constructor() {
    this.collection = db.collection("users");
  }

  /**
   * Get all users
   * @param {number} limit - Number of users to retrieve (optional)
   * @param {string} startAfter - Last user ID to start after (for pagination)
   * @returns {Promise<Array>} Array of user objects
   */
  async getAllUsers(limit = 50, startAfter = null) {
    let query = this.collection.orderBy("createdAt");

    if (startAfter) {
      const startAfterDoc = await this.collection.doc(startAfter).get();
      query = query.startAfter(startAfterDoc);
    }

    query = query.limit(limit);

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      password: undefined, // Exclude password from the returned data
    }));
  }

  /**
   * Tạo người dùng mới
   * @param {string} email - Email của người dùng
   * @param {string} password - Mật khẩu của người dùng
   * @param {string} username - Tên người dùng
   * @param {string} [role='user'] - Vai trò của người dùng
   * @param {string} [avatar=''] - Hình ảnh người dùng
   * @returns {Promise<{id: string, email: string, username: string, role: string}>} Thông tin người dùng đã tạo
   */
  async createUser(email, password, role = "user", avatar = "") {
    // Kiểm tra email đã tồn tại
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      throw new Error("Email is already in use");
    }

    // Kiểm tra độ mạnh của mật khẩu (ví dụ, ít nhất 8 ký tự, bao gồm số và chữ cái)
    // const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    // if (!password.match(passwordRegex)) {
    //   throw new Error(
    //     "Password must be at least 8 characters long and include both letters and numbers."
    //   );
    // }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await this.collection.add({
      email,
      username: null,
      password: hashedPassword,
      role,
      avatar: null,
      playlistsId: null, // Giá trị mặc định hoặc bỏ trống
      favoritesId: null,
      followsId: null,
      waitinglistId: null,
      listeninghistoryId: null,
      reportsId: null,
      recommendations: [],
      createdAt: new Date(),
    });
    return { id: newUser.id, email, role };
  }

  /**
   * Lấy thông tin người dùng bằng email
   * @param {string} email - Email của người dùng
   * @returns {Promise<{id: string, email: string, password: string, role: string} | null>} Thông tin người dùng hoặc null nếu không tìm thấy
   */
  async getUserByEmail(email) {
    const snapshot = await this.collection
      .where("email", "==", email)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }
    return null;
  }

  /**
   * Lấy thông tin người dùng bằng ID
   * @param {string} id - ID của người dùng
   * @returns {Promise<{id: string, email: string, role: string} | null>} Thông tin người dùng hoặc null nếu không tìm thấy
   */
  async getUserById(id) {
    const user = await this.collection.doc(id).get();
    if (user.exists) {
      const userData = user.data();
      delete userData.password; // Loại bỏ password khỏi dữ liệu trả về
      return { id: user.id, ...userData };
    }
    return null;
  }

  /**
   * Cập nhật thông tin người dùng
   * @param {string} id - ID của người dùng
   * @param {Object} data - Dữ liệu cần cập nhật
   * @returns {Promise<{id: string, [key: string]: any}>} Thông tin người dùng đã cập nhật
   */
  async updateUser(id, data) {
    const userRef = this.collection.doc(id);
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error('User not found.');
      }
      transaction.update(userRef, data);
    });
    return { id, ...data };
  }
  

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updates - Object containing updates (username and/or avatar)
   * @returns {Promise<Object>} Updated user data
   */
  async updateProfile(userId, updates) {
    const userRef = this.collection.doc(userId);
    const user = await userRef.get();

    if (!user.exists) {
      throw new Error("User not found");
    }

    const validUpdates = {};
    if (updates.username !== undefined) {
      validUpdates.username = updates.username;
    }

    // Chỉ cập nhật nếu có dữ liệu hợp lệ
    if (Object.keys(validUpdates).length > 0) {
      await userRef.update(validUpdates);
    }

    // Trả về dữ liệu người dùng đã cập nhật
    return { id: user.id, ...user.data(), ...validUpdates };
  }

  /**
   * Upload avatar image
   * @param {string} userId - User ID
   * @param {Buffer} fileBuffer - File buffer of the image
   * @param {string} mimeType - MIME type of the image
   * @returns {Promise<string>} URL of the uploaded image
   */
 

  async uploadAvatar(userId, fileBuffer, mimeType) {
    // Kiểm tra định dạng ảnh
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validMimeTypes.includes(mimeType)) {
      throw new Error('Invalid image format. Please upload JPEG, PNG, or GIF images.');
    }
  
    // Đặt giới hạn kích thước file (ví dụ: 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (fileBuffer.length > maxSize) {
      throw new Error('File size exceeds limit. Please upload an image smaller than 2MB.');
    }
  
    // Nén ảnh trước khi tải lên
    const compressedBuffer = await sharp(fileBuffer)
      .resize({ width: 300, height: 300 }) // Resize ảnh về kích thước 300x300
      .toBuffer();
  
    // Đặt tên file
    const fileName = `avatar/${userId}_${Date.now()}.${mimeType.split('/')[1]}`;
    const file = storage.file(fileName);
  
    // Lưu file lên Firebase Storage
    await file.save(compressedBuffer, {
      metadata: { contentType: mimeType },
      public: true, // Tạo URL công khai
    });
  
    // Lấy URL công khai của file đã lưu
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2500',
    });
  
    // Cập nhật thông tin avatar trong hồ sơ người dùng
    await this.updateProfile(userId, { avatar: url });
    return url;
  }

  async createPasswordResetToken(email) {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const passwordResetExpires = Date.now() + 10 * 60 * 1000; // Token hết hạn sau 10 phút

    await this.collection.doc(user.id).update({
      passwordResetToken,
      passwordResetExpires
    });

    return resetToken;
  }

  async resetPassword(token, newPassword) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const snapshot = await this.collection
      .where('passwordResetToken', '==', hashedToken)
      .where('passwordResetExpires', '>', Date.now())
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new Error('Token is invalid or has expired');
    }

    const user = snapshot.docs[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await user.ref.update({
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null
    });

    return { id: user.id, email: user.data().email };
  }
}
  




module.exports = new UserModel();
