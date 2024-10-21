const admin = require('firebase-admin');
const serviceAccount = require('../../be-musicheals-firebase-adminsdk-5h4p2-1c181418a5.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "be-musicheals.appspot.com" // Your storage bucket
});

// Initialize Firestore and Storage
const db = admin.firestore();
const bucket = admin.storage().bucket(); // Get a reference to the storage bucket

module.exports = { admin, db, bucket }; // Export the bucket
