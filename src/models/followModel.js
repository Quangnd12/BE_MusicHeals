// src/models/followModel.js
const { db } = require("../config/firebase"); // Kết nối với Firestore

// Tên collection trong Firestore
const followsCollection = db.collection("follows");

// Tạo follow mới
const createFollow = async (followData) => {
  const newFollow = {
    ...followData,
    followed_at: new Date(), // Thêm thời gian theo dõi
  };

  try {
    const followRef = await followsCollection.add(newFollow); // Thêm document mới vào collection follows
    return followRef.id; // Trả về ID của follow mới tạo
  } catch (error) {
    throw new Error("Error creating follow: " + error.message);
  }
};

// Lấy tất cả các follow
const getAllFollows = async () => {
  try {
    const snapshot = await followsCollection.get(); // Lấy tất cả dữ liệu từ collection follows
    const follows = snapshot.docs.map((doc) => ({
      followId: doc.id,
      ...doc.data(),
    })); // Biến đổi dữ liệu từ snapshot
    return follows;
  } catch (error) {
    throw new Error("Error fetching follows: " + error.message);
  }
};

// Lấy thông tin follow theo ID
const getFollowById = async (followId) => {
  try {
    const followDoc = await followsCollection.doc(followId).get(); // Lấy follow theo ID
    if (!followDoc.exists) {
      throw new Error("Follow not found");
    }
    return { followId: followDoc.id, ...followDoc.data() };
  } catch (error) {
    throw new Error("Error fetching follow: " + error.message);
  }
};

// Xóa follow theo ID
const deleteFollow = async (followId) => {
  try {
    const followDoc = await followsCollection.doc(followId).delete(); // Xóa follow theo ID
    return followDoc;
  } catch (error) {
    throw new Error("Error deleting follow: " + error.message);
  }
};

module.exports = {
  createFollow,
  getAllFollows,
  getFollowById,
  deleteFollow,
};
