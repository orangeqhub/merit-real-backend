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

function emitNotificationRead(userId, notification) {
  emitToUser(userId, 'notification:read', notification);
}

function emitNotificationCount(userId, unreadCount) {
  emitToUser(userId, 'notification:count-updated', { unreadCount });
}

function buildDomainEnvelope(event, payload = {}) {
  const entityId = payload.entityId ?? payload.interest?.id ?? payload.booking?.id ?? null;
  return {
    eventId: payload.eventId || `${event}:${entityId || 'none'}:${Date.now()}`,
    ...payload,
  };
}

function emitDomainEvent(userId, event, payload) {
  if (!userId) return;
  emitToUser(userId, event, buildDomainEnvelope(event, payload));
}

function emitExpressInterestUpdated(recipients, interest, action = 'updated') {
  const payload = buildDomainEnvelope(`express-interest:${action}`, {
    entityType: 'express_interest',
    entityId: interest?.id,
    action,
    interest,
  });
  const seen = new Set();
  for (const userId of recipients || []) {
    const id = Number(userId);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    emitToUser(id, 'express-interest:updated', payload);
    if (action !== 'updated') {
      emitToUser(id, `express-interest:${action}`, payload);
    }
  }
  emitToRole('ADMIN', 'express-interest:updated', payload);
  emitToRole('SALES_MEMBER', 'express-interest:updated', payload);
}

function emitBookingUpdated(recipients, booking, action = 'updated') {
  const payload = buildDomainEnvelope(`booking:${action}`, {
    entityType: 'booking_request',
    entityId: booking?.id,
    action,
    booking,
  });
  const seen = new Set();
  for (const userId of recipients || []) {
    const id = Number(userId);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    emitToUser(id, 'booking:updated', payload);
    if (action !== 'updated') {
      emitToUser(id, `booking:${action}`, payload);
    }
  }
  emitToRole('ADMIN', 'booking:updated', payload);
  emitToRole('SALES_MEMBER', 'booking:updated', payload);
}

module.exports = {
  initRealtime,
  getIo,
  emitToUser,
  emitToRole,
  emitWalletUpdate,
  emitNotification,
  emitNotificationRead,
  emitNotificationCount,
  emitDomainEvent,
  emitExpressInterestUpdated,
  emitBookingUpdated,
};
