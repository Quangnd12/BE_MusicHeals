const UserModel = require("../models/userModel");
const generateToken = require("../utils/generateToken");
// const isCompanyEmail = require("../utils/isCompanyEmail");
const bcrypt = require("bcryptjs");
const { admin } = require("../config/firebase");
const sendEmail = require("../utils/sendEmail");
const { bucket } = require("../config/firebase");
const db = require('../config/db')
const { format } = require("util");
const jwt = require("jsonwebtoken");
const path = require("path");
const crypto = require("crypto");

class AuthController {
  static async register(req, res) {
    try {
      const { username, password, birthday, email, avatar } = req.body;

      // Xác định vai trò dựa trên miền email
      const role = "user";
      // const role = isCompanyEmail(email) ? "admin" : "user";

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
      const { idToken, userData } = req.body;
      
      if (!idToken) {
        return res.status(400).json({ message: "Missing ID token" });
      }

      // Verify the token first
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } catch (tokenError) {
        console.error("Token verification error:", tokenError);
        return res.status(401).json({ message: "Invalid token" });
      }

      // Create or get existing user
      const userId = await UserModel.createUserWithGoogle({
        ...userData,
        email: decodedToken.email,
        idToken
      });

      // Get user details after creation/retrieval
      const [userDetails] = await db.execute(
        'SELECT id, username, email, avatar, role FROM users WHERE id = ?',
        [userId]
      );

      const user = userDetails[0];

      // Create JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );

      res.status(201).json({
        message: "Google authentication successful",
        token,
        user
      });
    } catch (error) {
      console.error("Error in Google Sign-Up:", error);
      res.status(500).json({ 
        message: error.message || "Google authentication failed",
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
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
    const updatedAt = new Date();

    try {
      const user = await UserModel.getUserById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (req.file) {
        // Xóa ảnh cũ
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

        return new Promise((resolve, reject) => {
          blobStream.on("error", (error) => {
            console.error("Upload error:", error);
            reject(error);
          });

          blobStream.on("finish", async () => {
            try {
              // Make the file public
              await blob.makePublic();

              // Get public URL
              const publicUrl = format(
                `https://storage.googleapis.com/${bucket.name}/${blob.name}`
              );
              userData.avatar = publicUrl;
              userData.updatedAt = updatedAt;

              await UserModel.updateUser(id, userData);
              resolve(
                res.status(200).json({
                  message: "User updated successfully",
                  avatarUrl: publicUrl,
                })
              );
            } catch (error) {
              reject(error);
            }
          });

          blobStream.end(req.file.buffer);
        });
      } else {
        userData.updatedAt = updatedAt;
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
          return res
            .status(500)
            .json({ message: "Failed to delete user avatar", error });
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
      const search = req.query.search || "";
      const sort = req.query.sort || "createdAt";
      const order = req.query.order?.toLowerCase() === "desc" ? "DESC" : "ASC";

      const result = await UserModel.getAllUsers({
        page,
        limit,
        search,
        sort,
        order,
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
            limit: result.limit,
          },
        });
      } else {
        // If all users are requested (page = 0)
        res.status(200).json({
          message: "All users retrieved successfully",
          data: result.users,
          total: result.total,
        });
      }
    } catch (error) {
      console.error("Error retrieving users:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }

  static async googleLogin(req, res) {
    const { idToken } = req.body;
 
    if (!idToken || typeof idToken !== 'string') {
       return res.status(400).json({ message: "Token không hợp lệ" });
    }
 
    try {
       const decodedToken = await admin.auth().verifyIdToken(idToken);
       const { uid, email, name, picture } = decodedToken;
 
       // Tìm hoặc tạo người dùng
       let user = await UserModel.getUserByEmail(email);
       if (!user) {
          const newUserData = {
             username: name || `user_${uid}`,
             password: null, 
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
          message: "Đăng nhập thành công",
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
          return res.status(400).json({ message: "Token không hợp lệ" });
       }
       res.status(500).json({ message: "Lỗi máy chủ", error });
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
        return res.status(404).json({
          success: false,
          message: "User not found with this email",
        });
      }
  
      // Generate reset token and its hash
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenHash = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
  
      console.log("Generated token for URL:", resetToken);
      console.log("Hashed token for DB:", resetTokenHash);
  
      // Set expiry to 1 hour from now
      const resetTokenExpiry = new Date(Date.now() + 3600000);
  
      // Save hashed token to database
      await UserModel.setResetToken(user.id, resetTokenHash, resetTokenExpiry);
  
      // Determine reset URL based on user role
      let resetUrl;
      let emailContent;
  
      if (user.role === 'admin') {
        resetUrl = `${process.env.ADMIN_URL}/reset-password/${resetToken}`;
        emailContent = `
          <h2>Password Reset Request - Admin Account</h2>
          <p>You requested to reset your password for your admin account.</p>
          <p><a href="${resetUrl}" target="_blank">Click here to reset your password</a></p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
          <p>Note: This reset link is specifically for admin accounts.</p>
        `;
      } else {
        resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
        emailContent = `
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password.</p>
          <p><a href="${resetUrl}" target="_blank">Click here to reset your password</a></p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
        `;
      }
  
      await sendEmail(user.email, "Password Reset Request", emailContent);
  
      res.status(200).json({
        success: true,
        message: "Password reset link sent to email",
      });
    } catch (error) {
      console.error("Error in forgotPassword:", error);
      res.status(500).json({
        success: false,
        message: "Error sending password reset email",
        error: error.message
      });
    }
  }

  static async resetPassword(req, res) {
    try {
      const { token } = req.params; // Unhashed token from URL
      const { newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Token and new password are required",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }

      // Hash the token from URL to compare with DB
      const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      console.log("Token from URL:", token);
      console.log("Hashed token to compare with DB:", hashedToken);

      // Get user with valid reset token
      const user = await UserModel.getUserByResetToken(hashedToken);

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset token",
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and clear reset token
      await UserModel.updatePassword(user.id, hashedPassword);
      await UserModel.clearResetToken(user.id);

      // Send confirmation email
      const emailContent = `
        <h2>Password Changed Successfully</h2>
        <p>Your password has been changed successfully.</p>
        <p>If you did not make this change, please contact support immediately.</p>
      `;

      await sendEmail(user.email, "Password Changed Successfully", emailContent);

      res.status(200).json({
        success: true,
        message: "Password reset successful",
      });
    } catch (error) {
      console.error("Error in resetPassword:", error);
      res.status(500).json({
        success: false,
        message: "Error resetting password",
        error: error.message
      });
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

      // Xóa ảnh cũ
      if (user.avatar && user.avatar.includes("firebase")) {
        const oldImagePath = user.avatar.split("/o/")[1].split("?")[0];
        try {
          await bucket.file(decodeURIComponent(oldImagePath)).delete();
        } catch (error) {
          console.log("Error deleting old image:", error);
        }
      }

      const timestamp = Date.now();
      const fileName = `avatars/${userId}_${timestamp}_${path.basename(
        req.file.originalname
      )}`;
      const blob = bucket.file(fileName);

      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      return new Promise((resolve, reject) => {
        blobStream.on("error", (error) => {
          console.error("Upload error:", error);
          reject(error);
        });

        blobStream.on("finish", async () => {
          try {
            // Make the file public
            await blob.makePublic();

            // Get public URL
            const publicUrl = format(
              `https://storage.googleapis.com/${bucket.name}/${blob.name}`
            );

            // Update user avatar in database
            await UserModel.updateUserAvatar(userId, publicUrl);

            resolve(
              res.status(200).json({
                message: "Upload successful",
                avatarUrl: publicUrl,
              })
            );
          } catch (error) {
            reject(error);
          }
        });

        blobStream.end(req.file.buffer);
      });
    } catch (error) {
      console.error("Error in uploadAvatar:", error);
      res.status(500).json({ message: "Server error", error });
    }
  }

  
}


module.exports = AuthController;
