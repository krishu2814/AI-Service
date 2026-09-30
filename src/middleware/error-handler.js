const { AppError } = require("../utils/errors/app-error");

/**
 * Global Error Handling Middleware for AI-Service
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Handle Mongoose CastError (Invalid ObjectId)
  if (err.name === "CastError") {
    const message = `Invalid ${err.path}: ${err.value}`;
    error = new AppError(message, 400, "INVALID_ID");
  }

  // Handle Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    const value = err.keyValue ? err.keyValue[field] : "";
    const message = `Duplicate value for '${field}': ${value}. Please use another value.`;
    error = new AppError(message, 409, "DUPLICATE_KEY_ERROR", { field, value });
  }

  // Handle Mongoose Validation Error
  if (err.name === "ValidationError") {
    const details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    const message = `Validation failed: ${details.map((d) => d.message).join(", ")}`;
    error = new AppError(message, 422, "VALIDATION_ERROR", details);
  }

  // Handle JWT Errors
  if (err.name === "JsonWebTokenError") {
    error = new AppError("Invalid authentication token", 401, "INVALID_TOKEN");
  }
  if (err.name === "TokenExpiredError") {
    error = new AppError("Authentication token has expired", 401, "TOKEN_EXPIRED");
  }

  // Normalize message-based patterns
  if (!error.statusCode) {
    const msg = error.message || "";
    if (msg.toLowerCase().includes("not found")) {
      error.statusCode = 404;
      error.errorCode = "NOT_FOUND";
    } else if (msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("token")) {
      error.statusCode = 401;
      error.errorCode = "UNAUTHORIZED";
    } else if (msg.toLowerCase().includes("forbidden") || msg.toLowerCase().includes("access denied")) {
      error.statusCode = 403;
      error.errorCode = "FORBIDDEN";
    } else if (
      msg.toLowerCase().includes("validation") ||
      msg.toLowerCase().includes("required") ||
      msg.toLowerCase().includes("must include") ||
      msg.toLowerCase().includes("invalid")
    ) {
      error.statusCode = 400;
      error.errorCode = "BAD_REQUEST";
    }
  }

  // Normalize to AppError
  const statusCode = error.statusCode || 500;
  const errorCode = error.errorCode || "INTERNAL_SERVER_ERROR";
  const message = error.message || "An unexpected internal server error occurred";
  const details = error.details || null;

  if (statusCode >= 500) {
    console.error(`[AI-Service Error] ${req.method} ${req.originalUrl}:`, err);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errorCode,
    error: message,
    err: message,
    data: details ? { details } : {},
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
};

module.exports = errorHandler;
