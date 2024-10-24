const admin = require('firebase-admin');
const serviceAccount = require('../../be-musicheals-firebase-adminsdk-5h4p2-1c181418a5.json'); // Đường dẫn đến file JSON bạn đã tải xuống

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket:"gs://be-musicheals.appspot.com"
});

const db = admin.firestore();
const bucket = admin.storage().bucket();


module.exports = { admin, db ,bucket};
