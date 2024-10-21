// upload.js
const multer = require('multer');
const { bucket } = require('../config/firebase'); // Đảm bảo bạn nhập bucket
const path = require('path');

// Cấu hình multer để lưu trữ trong bộ nhớ
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Giới hạn 5MB
  },
  fileFilter: (req, file, cb) => {
    // Kiểm tra loại tệp
    if (file.fieldname === 'file_song') {
      if (!file.originalname.match(/\.(mp3|wav|ogg)$/)) {
        return cb(new Error('Chỉ cho phép tệp âm thanh!'), false);
      }
    } else if (file.fieldname === 'image') {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Chỉ cho phép tệp hình ảnh!'), false);
      }
    }
    cb(null, true);
  }
});

// Middleware Multer cho xử lý nhiều tệp tải lên
const handleUpload = upload.fields([
  { name: 'file_song', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]);

// Hàm tạo tên tệp duy nhất
const generateUniqueFileName = (originalname) => {
  const timestamp = Date.now();
  const extension = path.extname(originalname);
  const basename = path.basename(originalname, extension);
  return `${basename}_${timestamp}${extension}`;
};

// Hàm tải lên tệp lên Firebase Storage
const uploadToFirebase = async (file, folder) => {
  try {
    const uniqueFileName = generateUniqueFileName(file.originalname);
    const fileName = `${folder}/${uniqueFileName}`;
    const fileUpload = bucket.file(fileName); // Sử dụng bucket để lấy tham chiếu tệp

    // Tạo stream ghi với metadata
    const blobStream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
        metadata: {
          originalname: file.originalname,
        },
      },
      resumable: false,
    });

    // Tải tệp lên
    return new Promise((resolve, reject) => {
      blobStream.on('error', (error) => {
        console.error('Lỗi tải lên:', error);
        reject(error);
      });

      blobStream.on('finish', async () => {
        try {
          // Đưa tệp thành công cộng
          await fileUpload.makePublic();

          // Lấy URL công cộng
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
          resolve({
            url: publicUrl,
            path: fileName,
          });
        } catch (error) {
          console.error('Lỗi khi đưa tệp thành công cộng:', error);
          reject(error);
        }
      });

      blobStream.end(file.buffer);
    });
  } catch (error) {
    console.error('Lỗi tải lên Firebase:', error);
    throw error;
  }
};

// Hàm trợ giúp cho các loại tệp cụ thể
const uploadAudio = async (file) => uploadToFirebase(file, 'audio');
const uploadImage = async (file) => uploadToFirebase(file, 'images');

// Hàm xử lý tải lên và tải lên tệp
const handleUploadAndUploadFiles = async (req, res) => {
  handleUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).send(err.message);
    }

    try {
      const audioFile = req.files['file_song'][0];
      const imageFile = req.files['image'][0];

      console.log('Đang tải lên tệp âm thanh:', audioFile.originalname);

      const audioUploadResult = await uploadAudio(audioFile);
      console.log('Tệp âm thanh đã tải lên thành công:', audioUploadResult);

      const imageUploadResult = await uploadImage(imageFile);
      console.log('Tệp hình ảnh đã tải lên thành công:', imageUploadResult);

      res.status(200).send({ audioUploadResult, imageUploadResult });
    } catch (uploadError) {
      console.error('Lỗi tải lên:', uploadError);
      res.status(500).send('Lỗi khi tải lên tệp');
    }
  });
};

module.exports = {
  handleUpload,
  uploadAudio,
  uploadImage,
  handleUploadAndUploadFiles
};
