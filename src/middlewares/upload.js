const multer = require('multer');
const { bucket } = require('../config/firebase');
const path = require('path');
const { CustomAPIError, statusCodes } = require("../errors");

// Multer configuration with enhanced validation and error handling
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif'];

  if (file.fieldname === 'file_song') {
    if (!allowedAudioTypes.includes(file.mimetype)) {
      cb(new CustomAPIError('Invalid audio file type. Allowed types: MP3, WAV, OGG', statusCodes.BAD_REQUEST), false);
      return;
    }
  } else if (file.fieldname === 'image') {
    if (!allowedImageTypes.includes(file.mimetype)) {
      cb(new CustomAPIError('Invalid image file type. Allowed types: JPEG, PNG, GIF', statusCodes.BAD_REQUEST), false);
      return;
    }
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
    files: 2 // Maximum 2 files (1 audio + 1 image)
  },
  fileFilter
});

// Enhanced error handling middleware for file uploads
const handleUpload = (req, res, next) => {
  const uploadFields = upload.fields([
    { name: 'file_song', maxCount: 1 },
    { name: 'image', maxCount: 1 }
  ]);

  uploadFields(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Handle Multer-specific errors
      let message = 'File upload error';
      let statusCode = statusCodes.BAD_REQUEST;

      switch (err.code) {
        case 'LIMIT_FILE_SIZE':
          message = 'File size exceeds limit of 20MB';
          break;
        case 'LIMIT_FILE_COUNT':
          message = 'Too many files uploaded';
          break;
        case 'LIMIT_UNEXPECTED_FILE':
          message = 'Unexpected field name in form data';
          break;
      }

      return res.status(statusCode).json({
        message,
        statusCode,
        error: err.code
      });
    } else if (err) {
      // Handle custom errors from fileFilter
      if (err instanceof CustomAPIError) {
        return res.status(err.statusCode).json({
          message: err.message,
          statusCode: err.statusCode
        });
      }
      // Handle other errors
      return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'Internal server error during file upload',
        statusCode: statusCodes.INTERNAL_SERVER_ERROR,
        error: err.message
      });
    }

    next();
  });
};

// Generate unique filename with sanitization
const generateUniqueFileName = (originalname) => {
  const timestamp = Date.now();
  const sanitizedName = path.basename(originalname, path.extname(originalname))
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toLowerCase();
  const extension = path.extname(originalname).toLowerCase();
  return `${sanitizedName}_${timestamp}${extension}`;
};

// Enhanced Firebase upload function with better error handling and validation
const uploadToFirebase = async (file, folder) => {
  if (!file || !file.buffer) {
    throw new CustomAPIError('Invalid file data', statusCodes.BAD_REQUEST);
  }

  try {
    const uniqueFileName = generateUniqueFileName(file.originalname);
    const fileName = `${folder}/${uniqueFileName}`;
    const fileUpload = bucket.file(fileName);

    const blobStream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
        metadata: {
          originalname: file.originalname,
          uploadedAt: new Date().toISOString()
        }
      },
      resumable: false
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', (error) => {
        console.error('Upload error:', error);
        reject(new CustomAPIError(
          `Error uploading file to storage: ${error.message}`,
          statusCodes.INTERNAL_SERVER_ERROR
        ));
      });

      blobStream.on('finish', async () => {
        try {
          await fileUpload.makePublic();
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
          
          resolve({
            url: publicUrl,
            path: fileName,
            filename: uniqueFileName,
            contentType: file.mimetype,
            size: file.size
          });
        } catch (error) {
          console.error('Error making file public:', error);
          reject(new CustomAPIError(
            'Error making file public',
            statusCodes.INTERNAL_SERVER_ERROR
          ));
        }
      });

      blobStream.end(file.buffer);
    });
  } catch (error) {
    console.error('Firebase upload error:', error);
    throw new CustomAPIError(
      'Error uploading to storage',
      statusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

// Specialized upload functions with validation
const uploadAudio = async (file) => {
  if (!file) {
    throw new CustomAPIError('Audio file is required', statusCodes.BAD_REQUEST);
  }
  return uploadToFirebase(file, 'audio');
};

const uploadImage = async (file) => {
  if (!file) {
    return null; // Image is optional
  }
  return uploadToFirebase(file, 'images');
};

// Test upload endpoint for Swagger
const testUpload = async (req, res) => {
  try {
    const results = {
      success: true,
      files: {}
    };

    if (req.files.file_song) {
      const audioResult = await uploadAudio(req.files.file_song[0]);
      results.files.audio = audioResult;
    }

    if (req.files.image) {
      const imageResult = await uploadImage(req.files.image[0]);
      results.files.image = imageResult;
    }

    res.status(statusCodes.OK).json({
      message: 'Files uploaded successfully',
      data: results
    });
  } catch (error) {
    console.error('Test upload error:', error);
    res.status(error.statusCode || statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || 'Error processing upload',
      statusCode: error.statusCode || statusCodes.INTERNAL_SERVER_ERROR
    });
  }
};

module.exports = {
  handleUpload,
  uploadAudio,
  uploadImage,
  testUpload
};