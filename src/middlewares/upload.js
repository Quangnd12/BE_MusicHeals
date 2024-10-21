const multer = require('multer');
const { CustomAPIError } = require('../errors');
const { statusCodes } = require('../constants');

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const uploadAudio = upload.single('audio');
const uploadImage = upload.single('image');

module.exports = { uploadAudio, uploadImage };