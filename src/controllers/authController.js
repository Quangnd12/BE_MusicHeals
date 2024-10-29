const UserModel = require("../models/userModel");
const generateToken = require("../utils/generateToken");
const isCompanyEmail = require("../utils/isCompanyEmail");
const bcrypt = require("bcryptjs");
const { admin } = require("../config/firebase");
const sendEmail = require("../utils/sendEmail");
const { bucket } = require("../config/firebase");
const { format } = require("util");
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

  static async login(req, res) {
    const { email, password, rememberMe } = req.body;
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

      res.status(200).json({ message: "Login successful", user, token, });
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

    try {
      // Lấy thông tin người dùng hiện tại
      const user = await UserModel.getUserById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Xử lý cập nhật avatar nếu có file mới
      if (req.file) {
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
        const fileName = `avatars/${id}_${timestamp}_${path.basename(
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
          userData.avatar = publicUrl; // Thay đổi avatar mới trong userData

          await UserModel.updateUser(id, userData);
          res.status(200).json({
            message: "User updated successfully",
            avatarUrl: publicUrl,
          });
        });

        // Ghi dữ liệu file vào stream
        blobStream.end(req.file.buffer);
      } else {
        // Nếu không có file mới, chỉ cập nhật thông tin người dùng
        await UserModel.updateUser(id, userData);
        res.status(200).json({
          message: "User updated successfully",
          updatedAt: updatedUser.updatedAt,
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

      // Xóa người dùng
      await UserModel.deleteUser(id);

      // Trả về thông báo thành công
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  }

  static async getAllUsers(req, res) {
    const users = await UserModel.getAllUsers();
    res.status(200).json(users);
  }

  static async getPaginatedUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1; // Lấy số trang từ query string
      const users = await UserModel.getPaginatedUsers(page);
      const totalCount = await UserModel.getTotalUsersCount(); // Lấy tổng số người dùng

      const totalPages = Math.ceil(totalCount / 5); // Tính tổng số trang

      res.status(200).json({
        users,
        currentPage: page,
        totalPages,
        totalCount,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  }

  static async googleLogin(req, res) {
    const { idToken } = req.body; // Nhận idToken từ frontend

    try {
      // Xác thực ID token với Firebase
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { uid, email, name, picture } = decodedToken;

      // Kiểm tra xem người dùng đã tồn tại chưa
      let user = await UserModel.getUserByEmail(email);
      if (!user) {
        // Nếu người dùng chưa tồn tại, tạo người dùng mới
        const role = isCompanyEmail(email) ? "admin" : "user";
        const userId = await UserModel.createUser({
          username: name,
          email,
          avatar: picture,
          role,
          password: null, // Mật khẩu sẽ là null vì người dùng sử dụng Google
        });
        user = { id: userId, email, role };
      }

      // Tạo token cho người dùng
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.status(200).json({ message: "Login with Google successful", token });
    } catch (error) {
      console.error("Error during Google login:", error);
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
