'use strict';

let io = null;

function initRealtime(httpServer) {
  const { Server } = require('socket.io');
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
    path: '/socket.io',
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token
        || (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '');
      if (!token) return next(new Error('UNAUTHORIZED'));
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      return next();
    } catch {
      return next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }
    if (socket.userRole) {
      socket.join(`role:${socket.userRole}`);
    }
  });

  return io;
}

function getIo() {
  return io;
}

function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(event, payload);
}

function emitToRole(role, event, payload) {
  if (!io || !role) return;
  io.to(`role:${role}`).emit(event, payload);
}

function emitWalletUpdate(agentId, payload) {
  emitToUser(agentId, 'wallet:updated', payload);
  emitToRole('ADMIN', 'wallet:updated', { ...payload, agentId });
}

function emitNotification(userId, notification) {
  emitToUser(userId, 'notification:new', notification);
}

module.exports = {
  initRealtime,
  getIo,
  emitToUser,
  emitToRole,
  emitWalletUpdate,
  emitNotification,
};
