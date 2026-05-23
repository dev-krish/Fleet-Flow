const jwt = require('jsonwebtoken');
const { asyncHandler } = require('./error');
const { sendError } = require('../utils/response');
const User = require('../models/User');

// Protect routes
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return sendError(res, 'Not authorized to access this route', 401);
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fleetflow_jwt_secret_key_2026_super_secure');

    // Get user from database (excluding password)
    let user;
    if (global.isMockDB) {
      const mockDb = require('../utils/mockDb');
      user = mockDb.db.users.find(u => u._id.toString() === decoded.id.toString());
    } else {
      user = await User.findById(decoded.id);
    }

    if (!user) {
      return sendError(res, 'User associated with this token does not exist', 401);
    }

    if (user.status === 'Inactive') {
      return sendError(res, 'Your user profile has been deactivated', 403);
    }

    // Attach user to req object
    req.user = user;
    next();
  } catch (err) {
    return sendError(res, 'Not authorized, token validation failed', 401);
  }
});

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Not authorized to access this route', 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        `User role '${req.user.role}' is not authorized to access this route`,
        403
      );
    }
    next();
  };
};

module.exports = {
  protect,
  authorize,
};
