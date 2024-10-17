const UserModel = require('../models/userModel');

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 5, searchTerm = '' } = req.query;
    const result = await UserModel.getAllUsers(parseInt(page), parseInt(limit), searchTerm);
    
    if (!result || !result.users) {
      throw new Error('Invalid result from UserModel.getAllUsers');
    }

    res.json({
      users: result.users,
      currentPage: parseInt(page),
      totalPages: result.totalPages,
      totalUsers: result.totalUsers
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'An error occurred while fetching users' });
  }
};

module.exports = { getAllUsers };
