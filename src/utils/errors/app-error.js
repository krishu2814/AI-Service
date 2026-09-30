/**
 * Application Error Hierarchy for AI-Service
 */

class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = "INTERNAL_SERVER_ERROR", details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = "Bad request", details = null, errorCode = "BAD_REQUEST") {
    super(message, 400, errorCode, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized access", details = null, errorCode = "UNAUTHORIZED") {
    super(message, 401, errorCode, details);
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Forbidden access", details = null, errorCode = "FORBIDDEN") {
    super(message, 403, errorCode, details);
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found", details = null, errorCode = "NOT_FOUND") {
    super(message, 404, errorCode, details);
  }
}

class ConflictError extends AppError {
  constructor(message = "Resource conflict", details = null, errorCode = "CONFLICT") {
    super(message, 409, errorCode, details);
  }
}

class ValidationError extends AppError {
  constructor(message = "Validation error", details = null, errorCode = "VALIDATION_ERROR") {
    super(message, 422, errorCode, details);
  }
}

class InternalServerError extends AppError {
  constructor(message = "Internal server error", details = null, errorCode = "INTERNAL_SERVER_ERROR") {
    super(message, 500, errorCode, details);
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = "Service unavailable", details = null, errorCode = "SERVICE_UNAVAILABLE") {
    super(message, 503, errorCode, details);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalServerError,
  ServiceUnavailableError,
};
