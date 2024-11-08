const UserModel = require("../models/userModel");
const generateToken = require("../utils/generateToken");
const isCompanyEmail = require("../utils/isCompanyEmail");
const bcrypt = require("bcryptjs");
const { admin } = require("../config/firebase");
const sendEmail = require("../utils/sendEmail");
const { bucket } = require("../config/firebase");
const { format } = require("util");
const jwt = require("jsonwebtoken");
const path = require("path");

class AuthController {
  static async register(req, res) {
    try {
      const { username, password, birthday, email, avatar } = req.body;

      // Xác định vai trò dựa trên miền email
      const role = isCompanyEmail(email) ? "admin" : "user";

      // Tạo người dùng với role tương ứng
      const userId = await UserModel.createUser({
        username,
        password,
        role,
        birthday,
        email,
        avatar,
      });

      // Tạo token cho người dùng mới đăng ký
      const token = generateToken({ id: userId, email, role });

      // Thiết lập cookie với token
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Chỉ sử dụng secure trong môi trường sản xuất
        maxAge: 24 * 60 * 60 * 1000, // 1 ngày
      });

      res
        .status(201)
        .json({ message: "User registered successfully", userId, token });
    } catch (error) {
      if (error.message === "Email đã được sử dụng") {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Server error", error });
    }
  }

  static async createUserWithGoogle(req, res) {
    try {
      const { username, email, avatar, role = "user" } = req.body;

      // Kiểm tra xem thông tin cần thiết đã được cung cấp chưa
      if (!email) {
        return res.status(400).json({ message: "Email là bắt buộc" });
      }

      // Tạo người dùng mới thông qua Google
      const userId = await UserModel.createUserWithGoogle({
        username,
        email,
        avatar,
        role,
      });

      // Tạo JWT token cho người dùng mới
      const token = jwt.sign(
        { id: userId, email, role },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRE,
        }
      );

      res.status(201).json({
        message: "Đăng ký thành công",
        token,
        user: {
          id: userId,
          username,
          email,
          avatar,
          role,
        },
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async login(req, res) {
    const { email, password, rememberMe } = req.body;
    console.log("Request body:", req.body);
    try {
      console.log("Attempting to log in with email:", email);

      const user = await UserModel.getUserByEmail(email);
      if (!user) {
        console.log("User not found for email:", email);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        console.log("Password mismatch for user:", email);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Create token
      const token = generateToken({ id: user.id, email, role: user.role });

      // Đặt thời gian sống của cookie: 1 ngày nếu không chọn rememberMe và 7 ngày nếu có
      const maxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: maxAge,
      });

      res.status(200).json({ message: "Login successful", user, token });
    } catch (error) {
      console.error("Error during login:", error); // In ra lỗi để debug
      res.status(500).json({ message: "Server error", error });
    }
  }

  static async getUser(req, res) {
    const { id } = req.params;
    const user = await UserModel.getUserById(id);
    res.status(200).json(user);
  }

  static async updateUser(req, res) {
    const { id } = req.params;
    const userData = req.body;
    const updatedAt = new Date(); // Tạo giá trị thời gian hiện tại

    try {
      const user = await UserModel.getUserById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Nếu có file mới, xử lý cập nhật avatar
      if (req.file) {
        // Xử lý xóa ảnh cũ nếu có
        if (user.avatar && user.avatar.includes("firebase")) {
          const oldImagePath = user.avatar.split("/o/")[1].split("?")[0];
          try {
            await bucket.file(decodeURIComponent(oldImagePath)).delete();
          } catch (error) {
            console.log("Error deleting old image:", error);
          }
        }

        const timestamp = Date.now();
        const fileName = `avatars/${id}_${timestamp}_${path.basename(
          req.file.originalname
        )}`;
        const blob = bucket.file(fileName);
        const blobStream = blob.createWriteStream({
          metadata: { contentType: req.file.mimetype },
        });

        blobStream.on("error", (error) => {
          console.error("Upload error:", error);
          return res
            .status(500)
            .json({ message: "Unable to upload image", error });
        });

        blobStream.on("finish", async () => {
          const publicUrl = format(
            `https://storage.googleapis.com/${bucket.name}/${blob.name}`
          );
          userData.avatar = publicUrl;
          userData.updatedAt = updatedAt; // Truyền updatedAt vào userData

          await UserModel.updateUser(id, userData);
          res.status(200).json({
            message: "User updated successfully",
            avatarUrl: publicUrl,
          });
        });

        blobStream.end(req.file.buffer);
      } else {
        // Nếu không có file mới, chỉ cập nhật thông tin người dùng
        userData.updatedAt = updatedAt; // Truyền updatedAt vào userData
        await UserModel.updateUser(id, userData);
        res.status(200).json({
          message: "User updated successfully",
          updatedAt,
        });
      }
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Server error", error });
    }
  }

  static async deleteUser(req, res) {
    try {
      const { id } = req.params;
  
      // Kiểm tra nếu người dùng tồn tại
      const user = await UserModel.getUserById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      // Xóa ảnh đại diện từ Firebase Storage nếu có
      if (user.avatar && user.avatar.includes("firebase")) {
        const imagePath = user.avatar.split("/o/")[1].split("?")[0]; // Lấy đường dẫn ảnh trên Storage
        try {
          await bucket.file(decodeURIComponent(imagePath)).delete();
          console.log("User avatar deleted from Firebase Storage");
        } catch (error) {
          console.error("Error deleting avatar from Firebase Storage:", error);
          return res.status(500).json({ message: "Failed to delete user avatar", error });
        }
      }
  
      // Xóa người dùng từ cơ sở dữ liệu
      await UserModel.deleteUser(id);
  
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Server error", error });
    }
  }
  

  static async getAllUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 0; // if page=0, get all users
      const limit = parseInt(req.query.limit) || 5;
      const search = req.query.search || '';
      const sort = req.query.sort || 'createdAt';
      const order = req.query.order?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      const result = await UserModel.getAllUsers({
        page,
        limit,
        search,
        sort,
        order
      });

      // If pagination is requested (page > 0)
      if (page > 0) {
        res.status(200).json({
          message: "Users retrieved successfully",
          data: result.users,
          pagination: {
            total: result.total,
            page: result.page,
            totalPages: result.totalPages,
            limit: result.limit
          }
        });
      } else {
        // If all users are requested (page = 0)
        res.status(200).json({
          message: "All users retrieved successfully",
          data: result.users,
          total: result.total
        });
      }
    } catch (error) {
      console.error("Error retrieving users:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }

  static async googleLogin(req, res) {
    const { idToken } = req.body;

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { uid, email, name, picture } = decodedToken;

      // Tìm người dùng qua email
      let user = await UserModel.getUserByEmail(email);

      // Nếu người dùng chưa tồn tại, tạo mới
      if (!user) {
        const newUserData = {
          username: name || `user_${uid}`,
          password: null, // Không lưu mật khẩu cho người dùng Google
          role: "user",
          email,
          avatar: picture || null,
        };

        const newUserId = await UserModel.createUser(newUserData);
        user = { id: newUserId, ...newUserData };
      }

      // Tạo JWT token
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Lưu token vào cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          username: user.username,
        },
        token,
      });
    } catch (error) {
      console.error("Error in Google login:", error);

      if (error.code === "auth/invalid-id-token") {
        return res.status(400).json({ message: "Invalid ID token" });
      }

      res.status(500).json({ message: "Server error", error });
    }
  }

  static async logout(req, res) {
    try {
      // Xóa cookie chứa token
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
      res.status(200).json({ message: "Logout successful" });
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ message: "Server error", error });
    }
  }

  static async forgotPassword(req, res) {
    const { email } = req.body;

    try {
      const user = await UserModel.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Tạo token reset password
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenHash = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      // Lưu token đã mã hóa vào user model, thiết lập thời hạn 1 giờ
      await UserModel.setResetToken(
        user.id,
        resetTokenHash,
        Date.now() + 3600000
      );

      // Link reset password cho client và admin
      const clientUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
      const adminUrl = `${process.env.ADMIN_URL}/reset-password/${resetToken}`;

      // Gửi email chứa link
      const emailContent = `
        <p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấp vào link để tiếp tục:</p>
        <p>Client: <a href="${clientUrl}">Reset Password for Client</a></p>
        <p>Admin: <a href="${adminUrl}">Reset Password for Admin</a></p>
      `;

      await sendEmail(user.email, "Password Reset Request", emailContent);
      res.status(200).json({ message: "Password reset email sent" });
    } catch (error) {
      console.error("Error in forgotPassword:", error);
      res.status(500).json({ message: "Server error", error });
    }
  }

  static async resetPassword(req, res) {
    const { token } = req.params;
    const { newPassword } = req.body;

    try {
      // Hash token để kiểm tra
      const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      // Lấy thông tin user theo token đã hash
      const user = await UserModel.getUserByResetToken(hashedToken);
      if (!user || user.resetTokenExpiry < Date.now()) {
        return res
          .status(400)
          .json({ message: "Token is invalid or has expired" });
      }

      // Cập nhật mật khẩu mới cho người dùng
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await UserModel.updatePassword(user.id, hashedPassword);

      // Xoá token reset password
      await UserModel.clearResetToken(user.id);

      res.status(200).json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Error in resetPassword:", error);
      res.status(500).json({ message: "Server error", error });
    }
  }

  static async uploadAvatar(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.params.id;
      const user = await UserModel.getUserById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Xử lý xóa ảnh cũ nếu có
      if (user.avatar && user.avatar.includes("firebase")) {
        const oldImagePath = user.avatar.split("/o/")[1].split("?")[0];
        try {
          await bucket.file(decodeURIComponent(oldImagePath)).delete();
        } catch (error) {
          console.log("Error deleting old image:", error);
          // Không return lỗi ở đây, tiếp tục upload ảnh mới
        }
      }

      // Tạo tên file mới với userId để tránh trùng lặp
      const timestamp = Date.now();
      const fileName = `avatars/${userId}_${timestamp}_${path.basename(
        req.file.originalname
      )}`;
      const blob = bucket.file(fileName);

      // Tạo stream để upload file
      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      // Xử lý lỗi trong quá trình upload
      blobStream.on("error", (error) => {
        console.error("Upload error:", error);
        return res
          .status(500)
          .json({ message: "Unable to upload image", error });
      });

      // Khi upload hoàn tất
      blobStream.on("finish", async () => {
        // Tạo URL công khai cho file
        const publicUrl = format(
          `https://storage.googleapis.com/${bucket.name}/${blob.name}`
        );

        // Cập nhật URL avatar mới vào database
        await UserModel.updateUserAvatar(userId, publicUrl);

        res.status(200).json({
          message: "Upload successful",
          avatarUrl: publicUrl,
        });
      });

      // Ghi dữ liệu file vào stream
      blobStream.end(req.file.buffer);
    } catch (error) {
      console.error("Error in uploadAvatar:", error);
      res.status(500).json({ message: "Server error", error });
    }
  }

  
}


module.exports = AuthController;
