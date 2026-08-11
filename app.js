'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const routes = require('./routes');
const serverState = require('./state');
const { healthHandler } = require('./utils/healthPayload');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const requestIdMiddleware = require('./middleware/requestId');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-Id'],
}));

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: accessLogStream }));
}

app.use(requestIdMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/health', (req, res) => healthHandler(req, res, serverState));
app.get('/api/health', (req, res) => healthHandler(req, res, serverState));

app.use('/api', (req, res, next) => {
  if (serverState.ready) return next();
  if (serverState.failed) {
    return res.status(503).json({
      success: false,
      status: 'failed',
      message: serverState.error || 'Backend startup failed.',
    });
  }
  return res.status(503).json({
    success: false,
    status: 'starting',
    message: `Backend is starting: ${serverState.stepLabel}`,
    step: serverState.step,
    totalSteps: serverState.totalSteps,
  });
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
