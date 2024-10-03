const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");

// Lấy thông tin người dùng theo ID
router.get("/:userId", authMiddleware, userController.getUserById);
router.put("/:userId", authMiddleware, userController.updateProfile);

module.exports = router;
