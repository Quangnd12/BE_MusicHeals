const multer = require('multer');
const { bucket } = require('../config/firebase');
const path = require('path');
const mm = require('music-metadata');

// Cấu hình multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // Giới hạn 20MB
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'file_song') {
      if (!file.originalname.match(/\.(mp3|wav|ogg)$/)) {
        return cb(new Error('Chỉ cho phép file âm thanh!'), false);
      }
    } else if (file.fieldname === 'image') {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Chỉ cho phép file hình ảnh!'), false);
      }
    }
    cb(null, true);
  }
});

// Middleware để xử lý tải lên nhiều file
const handleUpload = upload.fields([
  { name: 'file_song', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]);

// Tạo tên file duy nhất
const generateUniqueFileName = (originalname) => {
  const timestamp = Date.now();
  const extension = path.extname(originalname);
  const basename = path.basename(originalname, extension);
  return `${basename}_${timestamp}${extension}`;
};

// Trích xuất metadata từ file âm thanh
const extractAudioMetadata = async (file) => {
  try {
    const metadata = await mm.parseBuffer(file.buffer, { mimeType: file.mimetype });
    return {
      duration: metadata.format.duration || 0,
      artist: metadata.common.artist || 'Unknown Artist',
      title: metadata.common.title || 'Unknown Title',
    };
  } catch (error) {
    console.error('Error extracting audio metadata:', error);
    return { duration: 0, artist: 'Unknown Artist', title: 'Unknown Title' };
  }
};

// Tải file lên Firebase Storage
const uploadToFirebase = async (file, folder) => {
  try {
    const uniqueFileName = generateUniqueFileName(file.originalname);
    const fileName = `${folder}/${uniqueFileName}`;
    const fileUpload = bucket.file(fileName);

    const blobStream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
        metadata: {
          originalname: file.originalname,
        },
      },
      resumable: false,
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', (error) => {
        console.error('Upload error:', error);
        reject(error);
      });

      blobStream.on('finish', async () => {
        try {
          await fileUpload.makePublic();
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
          resolve({
            url: publicUrl,
            path: fileName,
          });
        } catch (error) {
          console.error('Error making file public:', error);
          reject(error);
        }
      });

      blobStream.end(file.buffer);
    });
  } catch (error) {
    console.error('Firebase upload error:', error);
    throw error;
  }
};

// Hàm xử lý tải lên âm thanh
const uploadAudio = async (file) => {
  try {
    const metadata = await extractAudioMetadata(file);
    const uploadResult = await uploadToFirebase(file, 'audio');

    return {
      ...uploadResult,
      duration: metadata.duration,
      metadata: {
        artist: metadata.artist,
        title: metadata.title
      }
    };
  } catch (error) {
    console.error('Error in uploadAudio:', error);
    throw error;
  }
};

// Hàm tải hình ảnh lên
const uploadImage = async (file) => uploadToFirebase(file, 'images');

// Hàm xử lý tải lên file và trả về kết quả
const handleUploadAndUploadFiles = async (req, res) => {
  handleUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).send({ error: err.message });
    }

    try {
      const results = {};

      if (req.files['file_song']) {
        const audioFile = req.files['file_song'][0];
        console.log('Uploading audio file:', audioFile.originalname);
        results.audio = await uploadAudio(audioFile);

        req.body.duration = results.audio.duration;
      }

      if (req.files['image']) {
        const imageFile = req.files['image'][0];
        results.image = await uploadImage(imageFile);
      }

      res.status(200).json(results);
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      res.status(500).send({ error: 'Error uploading files', details: uploadError.message });
    }
  });
};

module.exports = {
  handleUpload,
  uploadAudio,
  uploadImage,
  handleUploadAndUploadFiles
};
