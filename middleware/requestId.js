'use strict';

const { randomUUID } = require('crypto');

function requestIdMiddleware(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const requestId = (incoming && String(incoming).trim()) || randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

module.exports = requestIdMiddleware;
