const express = require('express');
const router = express.Router();
const countryController = require('../controllers/countryController'); 
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', countryController.getAllCountries);
router.get('/:id', countryController.getCountryById);
router.post('/', upload.single('image'), countryController.createCountry); 
router.put('/:id', upload.single('image'), countryController.updateCountry); 
router.delete('/:id', countryController.deleteCountry);


module.exports = router;
