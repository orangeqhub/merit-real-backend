'use strict';

const {
  serializeSequelizeError,
  isSequelizeError,
  formatSequelizeErrorMessage,
} = require('../utils/sequelizeError');

const notFoundHandler = (req, res) => {
  const payload = {
    success: false,
    message: `API endpoint '${req.originalUrl}' not found.`,
    code: 'NOT_FOUND',
    errors: [],
  };
  const requestId = req.requestId || req.headers['x-request-id'] || null;
  if (requestId) payload.requestId = requestId;
  res.status(404).json(payload);
};

const errorHandler = (err, req, res, _next) => {
  const requestId = req.requestId || req.headers['x-request-id'] || null;

  console.error(JSON.stringify({
    scope: 'errorHandler',
    requestId,
    method: req.method,
    path: req.originalUrl,
    actor: req.user?.id || null,
    code: err.code || err.name || null,
    message: err.message,
    status: err.status || 500,
  }));

  let statusCode = err.status || 500;
  let message = 'An unexpected database or server error occurred.';
  let errors = [];
  let code = err.code || undefined;

  if (err.status && err.message && err.code) {
    statusCode = err.status;
    message = err.message;
    errors = Array.isArray(err.errors) ? err.errors : [];
    code = err.code;
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File too large.';
    errors = [{ field: 'file', message }];
    code = 'LIMIT_FILE_SIZE';
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    message = `Upload error: ${err.message}`;
    errors = [{ field: 'file', message: err.message }];
    code = 'UPLOAD_ERROR';
  } else if (err.name === 'SequelizeConnectionRefusedError' || err.name === 'SequelizeConnectionError') {
    statusCode = 503;
    message = 'Database is unavailable. Please ensure PostgreSQL is running and try again.';
    code = 'DB_UNAVAILABLE';
  } else if (isSequelizeError(err)) {
    statusCode = err.status || 400;
    message = formatSequelizeErrorMessage(err);
    code = code || err.name || 'SEQUELIZE_ERROR';
    errors = err.errors?.length
      ? err.errors.map((item) => ({
          field: item.path || null,
          message: item.message || null,
          type: item.type || null,
          value: item.value ?? null,
        }))
      : [];
  } else if (err.status && err.message) {
    statusCode = err.status;
    message = err.message;
    errors = Array.isArray(err.errors) ? err.errors : [];
    code = code || 'REQUEST_ERROR';
  } else if (process.env.NODE_ENV === 'development') {
    message = err.message;
    errors = err.stack ? [err.stack] : [];
    code = code || 'INTERNAL_ERROR';
  } else {
    code = code || 'INTERNAL_ERROR';
  }

  const payload = {
    success: false,
    message,
    code,
    errors,
  };
  if (requestId) payload.requestId = requestId;

  if (process.env.NODE_ENV === 'development' && isSequelizeError(err)) {
    payload.sequelize = serializeSequelizeError(err);
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
