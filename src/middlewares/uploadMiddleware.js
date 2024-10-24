const { bucket } = require('../config/firebase');
const sharp = require('sharp');  // Thư viện nén ảnh

async function uploadImage(file) {
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
  const allowedFormats = ['image/png', 'image/jpeg', 'image/jpg'];
  if (!allowedFormats.includes(file.mimetype)) {
    throw new Error('Invalid file format. Only PNG, JPG, JPEG are allowed.');
  }

  // Kiểm tra kích thước file (ví dụ: không vượt quá 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('File is too large. Maximum size is 5MB.');
  }

  // Tạo tên file duy nhất để lưu trên Firebase Storage
  const fileName = `${file.originalname}`;

  // Nén ảnh nếu cần
  let fileBuffer = file.buffer;
  if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
    try {
      // Dùng sharp để nén ảnh và chuyển thành buffer
      fileBuffer = await sharp(file.buffer)
        .resize({ width: 800, height: 800, fit: 'inside' })  // Resize nếu cần thiết
        .toBuffer();
      console.log('Image compressed successfully');
    } catch (error) {
      throw new Error('Error compressing the image: ' + error.message);
    }
  }

  // Upload file lên Firebase Storage
  return new Promise((resolve, reject) => {
    const blob = bucket.file(`UploadImage/${fileName}`);  // Tạo blob với tên file
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype,  // Thiết lập metadata cho file
      },
    });

    blobStream.on('error', (err) => {
      console.error('Error uploading file:', err);  // Log lỗi chi tiết
      reject(`Failed to upload file: ${err.message}`);
    });

    blobStream.on('finish', () => {
      // Đường dẫn công khai của file sau khi upload thành công
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/UploadImage/${blob.name}`;
      console.log('File uploaded successfully:', publicUrl);  // Log URL để kiểm tra
      resolve(fileName);  // Trả về tên file đã upload thay vì URL
    });

    // Kết thúc stream với dữ liệu file
    blobStream.end(fileBuffer);
  });
}

module.exports = {
  uploadImage,
};
