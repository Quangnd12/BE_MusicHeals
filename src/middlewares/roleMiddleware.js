const roleMiddleware = (roles) => {
  return (req, res, next) => {
    // Kiểm tra nếu thông tin người dùng chưa tồn tại
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized. Please log in first.' });
    }

    // Kiểm tra vai trò của người dùng
    if (!roles.some(role => role === req.user.role)) {
      console.log(`Access denied for user with role: ${req.user.role}`);
      return res.status(403).json({ message: `Access denied. Required role(s): ${roles.join(', ')}.` });
    }

    next();
  };
};

module.exports = roleMiddleware;
