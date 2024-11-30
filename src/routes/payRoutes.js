const express = require('express');
const router = express.Router();
const payController = require('../controllers/payController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.get('/all',payController.getAllPayment); 
router.post('/',payController.Payment); 
router.post('/order',authMiddleware, payController.addPayments); 
router.get('/',payController.updateExpiringPayments); 
router.get('/user',authMiddleware, payController.getPaymentByUser); 
router.put('/',authMiddleware, payController.renewPayments); 
module.exports = router;
