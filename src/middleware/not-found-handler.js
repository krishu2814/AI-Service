const { NotFoundError } = require("../utils/errors/app-error");

/**
 * 404 Route Not Found Middleware for AI-Service
 */
const notFoundHandler = (req, res, next) => {
  next(new NotFoundError(`Resource not found on ${req.method} ${req.originalUrl}`));
};

module.exports = notFoundHandler;
