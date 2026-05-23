const { sendError } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  if (process.env.NODE_ENV === 'development') {
    console.error(err);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    return sendError(res, message, 440);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate field value entered: ${field}. Please use another value.`;
    return sendError(res, message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message).join(', ');
    return sendError(res, message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Not authorized, invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Not authorized, token expired', 401);
  }

  return sendError(
    res,
    error.message || 'Server Error',
    error.statusCode || 500,
    error.errors || null
  );
};

// Async middleware handler wrapper (avoid try-catch boilerplate in routes)
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = {
  errorHandler,
  asyncHandler,
};
