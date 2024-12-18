const express = require('express');
const router = express.Router();
const statisticalController = require('../controllers/statisticaController');

router.get('/month/:year', statisticalController.getRevenueByMonth);
router.get('/year/:year', statisticalController.getTotalAmountByYear);

module.exports = router;
