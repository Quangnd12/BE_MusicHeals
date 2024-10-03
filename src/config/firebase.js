const admin = require('firebase-admin');
const serviceAccount = require('../../be-musicheals-firebase-adminsdk-5h4p2-1c181418a5.json'); // Đường dẫn đến file JSON bạn đã tải xuống

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

module.exports = { admin, db };
