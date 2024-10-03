const UserModel = require('../models/userModel');

const getAllUsers = async (req, res) => {
  try {
    const { limit = 10, startAfter = null } = req.query;
    const users = await UserModel.getAllUsers(parseInt(limit), startAfter);
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'An error occurred while fetching users' });
  }
};

module.exports = { getAllUsers };
