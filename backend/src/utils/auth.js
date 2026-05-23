const jwt = require('jsonwebtoken');

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'fleetflow_jwt_secret_key_2026_super_secure',
    { expiresIn: '1d' } // 1 day access token for smoother testing in development
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || 'fleetflow_jwt_refresh_secret_key_2026_super_secure',
    { expiresIn: '7d' }
  );
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};
