'use strict';

function buildHealthPayload(serverState) {
  const applicationState = serverState.getApplicationState();
  const status = applicationState.toLowerCase();
  const databaseStatus = serverState.databaseConnected ? 'connected' : 'pending';

  let message = serverState.error;
  if (!message) {
    if (applicationState === 'READY') message = 'Backend API is ready.';
    else if (applicationState === 'FAILED') message = 'Backend startup failed.';
    else message = `Backend is starting: ${serverState.stepLabel}`;
  }

  return {
    success: applicationState === 'READY',
    status: applicationState === 'READY' ? 'healthy' : status,
    applicationState,
    message,
    phase: serverState.phase,
    step: serverState.step,
    totalSteps: serverState.totalSteps,
    stepLabel: serverState.stepLabel,
    startedAt: serverState.startedAt,
    readyAt: serverState.readyAt,
    uptimeSeconds: serverState.getUptimeSeconds(),
    timestamp: new Date().toISOString(),
    database: databaseStatus,
    databaseDetails: {
      connected: serverState.databaseConnected,
      status: databaseStatus,
    },
  };
}

function healthHandler(req, res, serverState) {
  const payload = buildHealthPayload(serverState);
  const httpStatus = payload.applicationState === 'READY' ? 200 : 503;
  return res.status(httpStatus).json(payload);
}

module.exports = {
  buildHealthPayload,
  healthHandler,
};
