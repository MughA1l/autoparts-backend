const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

// Protect routes - must be logged in
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError('Not authorized, no token provided', 401);
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select('-password');

  if (!user) {
    throw new ApiError('User no longer exists', 401);
  }

  if (!user.isActive) {
    throw new ApiError('Your account has been blocked. Please contact support.', 403);
  }

  req.user = user;
  next();
});

// Authorize roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ApiError(
        `Role '${req.user.role}' is not authorized to access this route`,
        403
      );
    }
    next();
  };
};

module.exports = { protect, authorize };
