// routes/ratingRoutes.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const ratingController = require('../controllers/ratingController');

// Tạo hoặc cập nhật đánh giá
router.post('/', 
    authMiddleware,
    ratingController.createOrUpdateRating
);

// Lấy tất cả đánh giá của một bài hát
router.get('/song/:songId', 
    ratingController.getSongRatings
);

// Lấy đánh giá của người dùng cho một bài hát
router.get('/user/song/:songId', 
    authMiddleware,
    ratingController.getUserRating
);

// Xóa đánh giá
router.delete('/song/:songId', 
    authMiddleware,
    ratingController.deleteRating
);


module.exports = router;