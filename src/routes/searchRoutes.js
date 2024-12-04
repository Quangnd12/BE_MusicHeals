const express = require('express');
const router = express.Router();
const SearchController = require('../controllers/searchController');

// Route tìm kiếm tổng hợp
router.get('/', SearchController.searchAll);

// Route tìm kiếm theo từng loại
router.get('/songs', SearchController.searchAll);
router.get('/albums', SearchController.searchAll);
router.get('/genres', SearchController.searchAll);

module.exports = router; 