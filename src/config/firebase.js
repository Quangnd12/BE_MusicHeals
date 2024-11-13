const admin = require('firebase-admin');
const serviceAccount = require('../../be-musicheals-a6d7a-firebase-adminsdk-epim6-22f72c72a2.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "gs://be-musicheals-a6d7a.appspot.com" // Your storage bucket
});

// Initialize Firestore and Storage
const db = admin.firestore();
const bucket = admin.storage().bucket(); // Get a reference to the storage bucket
const storage = admin.storage();

module.exports = { admin, db, bucket, storage }; // Export the bucket
