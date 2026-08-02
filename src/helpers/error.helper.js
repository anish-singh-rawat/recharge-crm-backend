import { HTTP_STATUS } from '../constants/http.js';

/**
 * Base application error — all custom errors extend this.
 */
export class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errors = []) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true; // distinguishes from programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, errors);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, HTTP_STATUS.UNAUTHORIZED);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, HTTP_STATUS.FORBIDDEN);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, HTTP_STATUS.NOT_FOUND);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, HTTP_STATUS.CONFLICT);
  }
}

export class BusinessError extends AppError {
  constructor(message, statusCode = HTTP_STATUS.BAD_REQUEST) {
    super(message, statusCode);
  }
}

export class WalletError extends BusinessError {
  constructor(message) {
    super(message, HTTP_STATUS.BAD_REQUEST);
  }
}

export class RechargeError extends BusinessError {
  constructor(message, statusCode = HTTP_STATUS.BAD_REQUEST) {
    super(message, statusCode);
  }
}

export class ProviderError extends AppError {
  constructor(message = 'Provider request failed', statusCode = HTTP_STATUS.BAD_GATEWAY) {
    super(message, statusCode);
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, HTTP_STATUS.SERVICE_UNAVAILABLE);
  }
}
