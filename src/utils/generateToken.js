const jwt = require('jsonwebtoken');

const generateToken = (userData) => {
  const tokenPayload = {
    id: userData.id,
    email: userData.email,
    role: userData.role,
    artist_id: userData.artist_id
  };

  const accessToken = jwt.sign(
    tokenPayload,
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  const refreshToken = jwt.sign(
    tokenPayload,
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

module.exports = generateToken;
