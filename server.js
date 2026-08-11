'use strict';

require('dotenv').config();
const app = require('./app');
const serverState = require('./state');
const { bootstrapApplication } = require('./bootstrap/startup');
const { initRealtime } = require('./utils/realtime');

const PORT = Number(process.env.PORT) || 3001;

async function startServer() {
  let server;

  try {
    server = await new Promise((resolve, reject) => {
      const s = app.listen(PORT, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(s);
      });

      s.on('error', reject);
    });
  } catch (err) {
    console.error(`[startup] Unable to bind http://localhost:${PORT}`);
    console.error(`[startup] ${err.message}`);
    if (err.code === 'EADDRINUSE') {
      console.error(
        `[startup] Port ${PORT} is already in use. Stop the other Node/API process or set a different PORT in .env.`
      );
    }
    process.exit(1);
    return;
  }

  try {
    initRealtime(server);
    console.log('[startup] Socket.IO realtime enabled');
  } catch (err) {
    console.error('[startup] Socket.IO init failed:', err.message);
  }

  console.log(`Merit API listening on http://localhost:${PORT} (initializing...)`);

  try {
    await bootstrapApplication();
    console.log(
      `Backend ready in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`
    );
  } catch (error) {
    serverState.markFailed(error);
    console.error('[startup] Bootstrap failed. HTTP server remains up so /api/health can report status.');
    console.error('[startup] Fix the database/schema issue and restart the process.');
  }

  return server;
}

process.on('unhandledRejection', (reason) => {
  console.error('[process] Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[process] Uncaught exception:', error);
  serverState.markFailed(error);
});

startServer();
