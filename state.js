'use strict';

/** Shared runtime flags for health checks and startup gating. */
module.exports = {
  ready: false,
  failed: false,
  phase: 'booting',
  step: 0,
  totalSteps: 4,
  stepLabel: 'Loading configuration',
  startedAt: new Date().toISOString(),
  readyAt: null,
  error: null,
  databaseConnected: false,

  getApplicationState() {
    if (this.failed) return 'FAILED';
    if (this.ready) return 'READY';
    return 'STARTING';
  },

  getUptimeSeconds() {
    return Math.floor((Date.now() - new Date(this.startedAt).getTime()) / 1000);
  },

  setStep(step, label) {
    this.step = step;
    this.stepLabel = label;
    console.log(`[${step}/${this.totalSteps}] ${label}`);
  },

  markReady() {
    this.ready = true;
    this.failed = false;
    this.phase = 'ready';
    this.readyAt = new Date().toISOString();
    console.log(`[${this.totalSteps}/${this.totalSteps}] Backend Ready`);
    console.log(`Current State: READY (uptime ${this.getUptimeSeconds()}s)`);
  },

  markFailed(error) {
    this.failed = true;
    this.ready = false;
    this.phase = 'failed';
    this.error = error?.message || String(error || 'Startup failed');
    console.error(`Current State: FAILED — ${this.error}`);
    if (error?.stack) console.error(error.stack);
  },
};
