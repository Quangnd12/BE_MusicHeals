const express = require('express');
const router = express.Router();
const mixController = require('../controllers/mixController');

router.post('/', mixController.createMix);
router.get('/', mixController.getAllMixes);
router.get('/:id', mixController.getMixById);
router.delete('/:id', mixController.deleteMix);

module.exports = router;