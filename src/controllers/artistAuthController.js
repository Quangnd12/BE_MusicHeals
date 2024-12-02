const ArtistAuthModel = require("../models/artistAuthModel");
const generateToken = require("../utils/generateToken");
const bcrypt = require("bcryptjs");
const sendEmail = require("../utils/sendEmail");
const { admin } = require("../config/firebase");
const { bucket } = require("../config/firebase");
const crypto = require("crypto");

class ArtistAuthController {
  static async register(req, res) {
    try {
      const { email, password, stage_name, avatar, biography = "", role = 1 } = req.body;

      const result = await ArtistAuthModel.createArtistUser({
        email,
        password,
        stage_name,
        avatar,
        biography,
        role
      });

      const { accessToken, refreshToken } = generateToken({
        id: result.userId,
        email,
        role: "artist",
        artist_id: result.artistId,
      });
      

      const tokenPayload = JSON.stringify({
        accessToken,
        refreshToken,
      });

      res.cookie("artist_token", encodeURIComponent(tokenPayload), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000,
      });

      try {
        await sendEmail({
          to: email,
          subject: "Welcome to Our Platform",
          text: `Welcome to our platform! Your account has been successfully created.`,
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }

      res.status(201).json({
        message: "Artist registered successfully",
        userId: result.userId,
        artistId: result.artistId,
        token: accessToken,
      });
    } catch (error) {
      if (error.message === "Email already in use") {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }

  static async googleRegister(req, res) {
    try {
      const { googleToken } = req.body;

      const decodedToken = await admin.auth().verifyIdToken(googleToken);
      const email = decodedToken.email;

      if (!email) {
        throw new Error("Email not found in Google token");
      }

      let artist = await ArtistAuthModel.getArtistByEmail(email);

      if (!artist) {
        const result = await ArtistAuthModel.createArtistUserWithGoogle(googleToken, {
          email,
          stage_name: decodedToken.name,
          avatar: decodedToken.picture,
          biography: "",
          role: 1
        });

        try {
          await sendEmail({
            to: email,
            subject: "Your Account Password",
            text: `Welcome! Your temporary password is ${result.randomPassword}. Please change it after login.`,
          });
        } catch (emailError) {
          console.error("Send email error:", emailError);
        }

        artist = {
          id: result.userId,
          email,
          stage_name: decodedToken.name,
          artist_id: result.artistId,
          avatar: decodedToken.picture
        };
      }

      const { accessToken, refreshToken } = generateToken({
        id: artist.id,
        email: artist.email,
        role: "artist",
        artist_id: artist.artist_id,
      });

      const tokenPayload = JSON.stringify({
        accessToken,
        refreshToken,
      });

      res.cookie("artist_token", encodeURIComponent(tokenPayload), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        message: "Google registration successful",
        artist: {
          id: artist.id,
          email: artist.email,
          stage_name: artist.stage_name,
          artist_id: artist.artist_id,
          avatar: artist.avatar,
        },
        token: accessToken,
      });
    } catch (error) {
      console.error("Google registration error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }

  static async login(req, res) {
    const { email, password, rememberMe } = req.body;
    try {
      const artist = await ArtistAuthModel.getArtistByEmail(email);
      if (!artist) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const passwordMatch = await bcrypt.compare(password, artist.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const { accessToken, refreshToken } = generateToken({
        id: artist.id,
        email,
        role: "artist",
        artist_id: artist.artist_id,
      });

      // Tạo chuỗi JSON encode và lưu vào cookie
      const tokenPayload = JSON.stringify({
        accessToken,
        refreshToken,
      });

      const maxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      res.cookie("artist_token", encodeURIComponent(tokenPayload), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: maxAge,
      });

      res.status(200).json({
        message: "Login successful",
        artist: {
          id: artist.id,
          email: artist.email,
          stage_name: artist.stage_name,
          artist_id: artist.artist_id,
          avatar: artist.avatar,
        },
        token: accessToken,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }

  static async googleLogin(req, res) {
    try {
      const { googleToken } = req.body;

      const decodedToken = await admin.auth().verifyIdToken(googleToken);
      const email = decodedToken.email;

      const artist = await ArtistAuthModel.getArtistByEmail(email);
      if (!artist) {
        return res.status(404).json({ message: "Artist not found. Please register first." });
      }

      const { accessToken, refreshToken } = generateToken({
        id: artist.id,
        email: artist.email,
        role: "artist",
        artist_id: artist.artist_id,
      });

      const maxAge = 24 * 60 * 60 * 1000;

      // Tạo chuỗi JSON encode và lưu vào cookie
      const tokenPayload = JSON.stringify({
        accessToken,
        refreshToken,
      });

      res.cookie("artist_token", encodeURIComponent(tokenPayload), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: maxAge,
      });

      res.status(200).json({
        message: "Google login successful",
        artist: {
          id: artist.id,
          email: artist.email,
          stage_name: artist.stage_name,
          artist_id: artist.artist_id,
          avatar: artist.avatar,
        },
        token: accessToken,
        expiresIn: maxAge
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }

  static async logout(req, res) {
    console.log("Cookies:", req.cookies);
    console.log("Headers:", req.headers);
    let token;
    if (req.cookies && req.cookies.artist_token) {
      try {
        // Parse token nếu nó được stringify
        const parsedToken = JSON.parse(decodeURIComponent(req.cookies.artist_token));
        token = parsedToken.accessToken;
      } catch (parseError) {
        console.error("Error parsing token:", parseError);
        token = req.cookies.artist_token;
      }
    } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    console.log("Extracted Token:", token);
    try {
      if (!token) {
        return res.status(200).json({
          success: true,
          message: "Logout successful",
        });
      }

      res.clearCookie("artist_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        domain: process.env.COOKIE_DOMAIN || undefined,
      });

      res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      console.error("Error during artist logout:", error);
      res.status(500).json({
        success: false,
        message: "Logout failed",
        error: error.message,
      });
    }
  }
  

  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          message: "Email là bắt buộc"
        });
      }

      // Kiểm tra email tồn tại trong database
      const artist = await ArtistAuthModel.getArtistByEmail(email);
      if (!artist) {
        return res.status(404).json({
          message: "Email không tồn tại trong hệ thống"
        });
      }

      // Tạo reset token và lưu vào database
      const resetToken = await ArtistAuthModel.createPasswordResetToken(email);

      // Tạo reset URL với token
      const resetURL = `${process.env.CLIENT_URL}/artist-portal/reset-password/${resetToken}`;

      // Template email hiện đại
      const emailContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .email-container {
                background: #ffffff;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                padding: 30px;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .logo {
                width: 150px;
                margin-bottom: 20px;
              }
              h1 {
                color: #1db954;
                font-size: 24px;
                margin-bottom: 20px;
                text-align: center;
              }
              .content {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 25px;
              }
              .button {
                display: inline-block;
                background-color: #1db954;
                color: white;
                text-decoration: none;
                padding: 12px 30px;
                border-radius: 25px;
                margin: 20px 0;
                text-align: center;
                font-weight: bold;
                transition: background-color 0.3s;
              }
              .button:hover {
                background-color: #1ed760;
              }
              .footer {
                text-align: center;
                font-size: 12px;
                color: #666;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
              }
              .warning {
                font-size: 13px;
                color: #666;
                font-style: italic;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="header">
                <h1>Xin chào ${artist.stage_name || 'Nghệ sĩ'}!</h1>
              </div>
              
              <div class="content">
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản nghệ sĩ của bạn trên MusicHeals.</p>
                
                <p>Để tiếp tục quá trình đặt lại mật khẩu, vui lòng click vào nút bên dưới:</p>
                
                <div style="text-align: center;">
                  <a href="${resetURL}" class="button" target="_blank">Đặt Lại Mật Khẩu</a>
                </div>
                
                <p class="warning">* Link này sẽ hết hạn sau 1 giờ vì lý do bảo mật.</p>
              </div>
              
              <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này hoặc liên hệ với đội ngũ hỗ trợ của chúng tôi.</p>
              
              <div class="footer">
                <p>© ${new Date().getFullYear()} MusicHeals. All rights reserved.</p>
                <p>Đây là email tự động, vui lòng không trả lời email này.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      // Gửi email
      await sendEmail(email, "Đặt lại mật khẩu MusicHeals", emailContent);

      res.status(200).json({
        message: "Email đặt lại mật khẩu đã được gửi",
        success: true
      });

    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({
        message: "Không thể xử lý yêu cầu đặt lại mật khẩu",
        error: error.message,
        success: false
      });
    }
  }

  static async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      console.log('Received reset request:', { token, password });

      if (!token || !password) {
        return res.status(400).json({
          message: "Token và mật khẩu mới là bắt buộc"
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          message: "Mật khẩu phải có ít nhất 6 ký tự"
        });
      }

      await ArtistAuthModel.resetPassword(token, password);

      res.status(200).json({
        message: "Mật khẩu đã được đặt lại thành công",
        success: true
      });

    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({
        message: "Không thể đặt lại mật khẩu",
        error: error.message,
        success: false
      });
    }
  }

  static async updateProfile(req, res) {
    try {
      const artist_id = req.artist?.artist_id;
      
      if (!artist_id) {
        return res.status(401).json({ 
          message: "Không tìm thấy ID nghệ sĩ" 
        });
      }

      const updateData = {
        stage_name: req.body.stage_name || null,
        biography: req.body.biography || null,
        role: req.body.role || null,
        avatar: null
      };

      // Xử lý upload ảnh nếu có
      if (req.file) {
        try {
          const currentArtist = await ArtistAuthModel.getArtistById(artist_id);
          
          if (!currentArtist) {
            return res.status(404).json({ message: "Không tìm thấy nghệ sĩ" });
          }

          // Xóa ảnh cũ nếu có
          if (currentArtist.avatar && 
              currentArtist.avatar !== 'https://storage.googleapis.com/music-app/default-artist-avatar.png' &&
              currentArtist.avatar.includes('storage.googleapis.com')) {
            try {
              const oldImagePath = currentArtist.avatar.split('/').pop().split('?')[0];
              await bucket.file(`artists/${oldImagePath}`).delete();
            } catch (error) {
              console.error("Lỗi xóa ảnh cũ:", error);
            }
          }

          // Upload ảnh mới với cấu hình public
          const fileExt = req.file.originalname.split('.').pop();
          const fileName = `artists/a${artist_id}_${Date.now().toString().slice(-6)}.${fileExt}`;
          const blob = bucket.file(fileName);
          
          // Tạo write stream với metadata
          const blobStream = blob.createWriteStream({
            metadata: {
              contentType: req.file.mimetype,
            },
            public: true, // Đặt blob là public
            resumable: false
          });

          // Xử lý upload
          await new Promise((resolve, reject) => {
            blobStream.on('finish', async () => {
              try {
                // Đặt file là public
                await blob.makePublic();
                
                // Lấy public URL
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
                resolve(publicUrl);
              } catch (error) {
                reject(error);
              }
            });
            
            blobStream.on('error', (error) => {
              reject(error);
            });
            
            blobStream.end(req.file.buffer);
          });

          // Cập nhật URL ảnh mới
          updateData.avatar = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        } catch (error) {
          console.error("Lỗi xử lý upload ảnh:", error);
          return res.status(500).json({ 
            message: "Lỗi upload ảnh", 
            error: error.message 
          });
        }
      }

      // Lọc bỏ các giá trị null
      const cleanUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== null)
      );

      if (Object.keys(cleanUpdateData).length === 0) {
        return res.status(400).json({ 
          message: "Không có dữ liệu cập nhật" 
        });
      }

      // Cập nhật profile
      const updated = await ArtistAuthModel.updateArtistProfile(artist_id, cleanUpdateData);
      
      if (!updated) {
        return res.status(400).json({ 
          message: "Cập nhật thất bại" 
        });
      }

      // Lấy thông tin profile đã cập nhật
      const updatedProfile = await ArtistAuthModel.getArtistById(artist_id);

      res.status(200).json({ 
        message: "Cập nhật profile thành công",
        profile: updatedProfile
      });

    } catch (error) {
      console.error("Lỗi cập nhật profile:", error);
      res.status(500).json({ 
        message: "Lỗi server", 
        error: error.message
      });
    }
  }

  static async validateToken(req, res) {
    let token;
  
    // Lấy token từ header hoặc cookie
    if (req.cookies && req.cookies.artist_token) {
      token = req.cookies.artist_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
  
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }
  
    try {
      // Decode token bằng JWT
      const decoded = require("jsonwebtoken").verify(token, process.env.JWT_SECRET);
  
      // Trả về thông tin nghệ sĩ từ token nếu token hợp lệ
      res.status(200).json({
        success: true,
        artist: {
          id: decoded.id,
          role: decoded.role,
          email: decoded.email,
          artist_id: decoded.artist_id,
        },
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired token",
        error: error.message,
      });
    }
  }
  
}

module.exports = ArtistAuthController;
