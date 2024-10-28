// src/config/db.js
const mysql = require('mysql2');

// Tạo pool kết nối đến MySQL
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Kiểm tra kết nối MySQL
db.getConnection((err, connection) => {
  if (err) {
    console.error("Kết nối MySQL thất bại:", err);
  } else {
    console.log("Kết nối MySQL thành công!");
    connection.release();
  }
});

module.exports = db.promise();
