import mongoose from 'mongoose';
import { AppError } from '../helpers/error.helper.js';
import { HTTP_STATUS } from '../constants/http.js';
import logger from '../config/logger.js';
import env from '../config/env.js';

export const notFoundHandler = (req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    errors: [],
  });
};

export const globalErrorHandler = (err, req, res, next) => {
  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = 'Internal server error';
  let errors = [];

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors || [];

    if (statusCode < 500) {
      logger.warn('Operational error', {
        message: err.message,
        statusCode,
        path: req.originalUrl,
        requestId: req.requestId,
      });
    } else {
      logger.error('Server operational error', {
        message: err.message,
        stack: err.stack,
        path: req.originalUrl,
        requestId: req.requestId,
      });
    }
  }

  else if (err instanceof mongoose.Error.CastError) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = `Invalid value for field '${err.path}': ${err.value}`;
    logger.warn('Mongoose CastError', { error: err.message, path: req.originalUrl });
  }

  else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY;
    message = 'Database validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    logger.warn('Mongoose ValidationError', { error: err.message });
  }

  else if (err.code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue?.[field];
    message = `Duplicate value: '${value}' already exists for ${field}`;
    logger.warn('MongoDB duplicate key', { field, value });
  }

  else if (err.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Token has expired';
  }

  else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'File size exceeds the allowed limit';
  }

  else {
    logger.error('Unhandled error', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
      requestId: req.requestId,
      userId: req.user?.id,
    });
  }

  const response = {
    success: false,
    message,
    errors,
  };

  if (env.app.isDev) {
    response.stack = err.stack;
    response.name = err.name;
  }

  res.status(statusCode).json(response);
};
