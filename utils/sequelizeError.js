'use strict';

function pickDefined(source, keys) {
  const out = {};
  for (const key of keys) {
    if (source && source[key] != null) out[key] = source[key];
  }
  return out;
}

function serializeSequelizeError(error) {
  if (!error || typeof error !== 'object') return null;

  const parent = error.parent || null;
  const original = error.original || parent || null;

  return {
    name: error.name ?? null,
    message: error.message ?? null,
    errors: Array.isArray(error.errors)
      ? error.errors.map((item) => ({
          message: item.message ?? null,
          type: item.type ?? null,
          path: item.path ?? null,
          value: item.value ?? null,
          validatorKey: item.validatorKey ?? null,
        }))
      : [],
    parent: pickDefined(parent, ['message', 'detail', 'code', 'constraint', 'table', 'schema']),
    original: pickDefined(original, ['message', 'detail', 'code', 'constraint', 'table', 'schema']),
  };
}

function isSequelizeError(error) {
  if (!error || typeof error !== 'object') return false;
  if (typeof error.name === 'string' && error.name.startsWith('Sequelize')) return true;
  return Boolean(error.parent || error.original || Array.isArray(error.errors));
}

function formatSequelizeErrorMessage(error) {
  const serialized = serializeSequelizeError(error);
  if (!serialized) return error?.message || 'Database error';

  const pgMessage = serialized.original.message || serialized.parent.message;
  const pgDetail = serialized.original.detail || serialized.parent.detail;

  if (pgMessage && pgDetail) return `${pgMessage} (${pgDetail})`;
  if (pgMessage) return pgMessage;

  const fieldErrors = serialized.errors
    .map((item) => (item.path ? `${item.path}: ${item.message}` : item.message))
    .filter(Boolean);

  if (fieldErrors.length) return fieldErrors.join('; ');
  return serialized.message || 'Database validation error';
}

module.exports = {
  serializeSequelizeError,
  isSequelizeError,
  formatSequelizeErrorMessage,
};
