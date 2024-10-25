const { bucket } = require('../config/firebase');

async function uploadAudio(file) {
  console.log('Received file:', file);  // Log chi tiết về file để kiểm tra

  // Kiểm tra sự tồn tại của file và thông tin cần thiết
  if (!file) {
    throw new Error('File is missing');
  }
  if (!file.originalname) {
    throw new Error('File name is missing');
  }
  if (!file.buffer) {
    throw new Error('File data is missing');
  }

  // Log thêm thông tin về file
  console.log(`File name: ${file.originalname}`);
  console.log(`File type: ${file.mimetype}`);
  console.log(`File size: ${file.size} bytes`);

  // Kiểm tra định dạng file
  const allowedFormats = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg'];
  if (!allowedFormats.includes(file.mimetype)) {
    throw new Error('Invalid file format. Only MP3, WAV, OGG are allowed.');
  }

  // Kiểm tra kích thước file (ví dụ: không vượt quá 10MB)
  const maxSize = 15 * 1024 * 1024; 
  if (file.size > maxSize) {
    throw new Error('File is too large. Maximum size is 10MB.');
  }

  // Tạo tên file duy nhất để lưu trên Firebase Storage
  const fileName = `${Date.now()}_${file.originalname}`; // Thêm timestamp để đảm bảo tên file duy nhất

  // Upload file lên Firebase Storage
  return new Promise((resolve, reject) => {
    const blob = bucket.file(`UploadAudio/${fileName}`);  // Tạo blob với tên file
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype,  // Thiết lập metadata cho file
      },
    });

    blobStream.on('error', (err) => {
      console.error('Error uploading file:', err);  // Log lỗi chi tiết
      reject(`Failed to upload file: ${err.message}`);
    });

    blobStream.on('finish', async () => {
      await blob.makePublic();
      // Đường dẫn công khai của file sau khi upload thành công
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      console.log('File uploaded successfully:', publicUrl);  // Log URL để kiểm tra
      resolve(publicUrl);  // Trả về URL của file đã upload
    });

    // Kết thúc stream với dữ liệu file
    blobStream.end(file.buffer);
  });
}

module.exports = {
  uploadAudio,
};
