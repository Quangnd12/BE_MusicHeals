const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");

dotenv.config();

const db = require("./src/config/db"); // Import file cấu hình MySQL
const authRoutes = require("./src/routes/authRoutes");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./src/config/swagger");
const artistRoutes = require("./src/routes/artistRoutes");
const followRoutes = require("./src/routes/followsRoutes");
const genreRoutes = require("./src/routes/genreRoutes");
const albumRoutes = require("./src/routes/albumRoutes");
const favoriteRoutes = require("./src/routes/favoriteRoutes");
const songRoutes = require("./src/routes/songRoutes");
const countryRoutes = require("./src/routes/countryRoutes");
const errorHandlerMiddleware = require("./src/middlewares/errorHandler");
const playlistRoutes = require('./src/routes/playlistRoutes');
const songArtistRoutes = require('./src/routes/song-artistRoutes');
const ratingRoutes = require("./src/routes/ratingRoutes");
const mixRoutes = require('./src/routes/mixRoutes');

const app = express();

app.use(bodyParser.json());

// Sử dụng middleware để xử lý JSON và form-data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cấu hình bảo mật HTTP headers
app.use(helmet());

// Cấu hình CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Middleware logging
app.use(morgan("dev"));

// Body parser để parse request body JSON
// app.use(bodyParser.json()); // Để parse JSON body
app.use(cookieParser())

// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/artists", artistRoutes);
app.use("/api", followRoutes);
app.use("/api/genres", genreRoutes);
app.use("/api/albums", albumRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use("/api/songs", songRoutes);
app.use('/api/playlists', playlistRoutes);
app.use("/api/countries", countryRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/song_artist', songArtistRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/mixes', mixRoutes);
// Xử lý lỗi 404 (Not Found)
app.use((req, res, next) => {
  res.status(404).json({
    message: "Không tìm thấy trang yêu cầu.",
  });
});

// Xử lý lỗi 500 (Server Error)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Có lỗi xảy ra từ server. Vui lòng thử lại sau.",
  });
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}/api`);
  console.log(`Swagger Docs available at http://localhost:${PORT}/api-docs`);
});
