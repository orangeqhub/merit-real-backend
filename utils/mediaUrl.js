'use strict';

const DEFAULT_PUBLIC_BASE = 'http://187.127.163.100:3500';

/**
 * Build a public absolute URL for a stored upload path.
 */
function resolveMediaUrl(req, relativePath) {
  if (!relativePath) return null;
  let value = String(relativePath).trim();
  if (!value) return null;

  value = value
    .replace(/https?:\/\/your_server_ip(?::\d+)?/gi, DEFAULT_PUBLIC_BASE)
    .replace(/https?:\/\/localhost(?::\d+)?/gi, DEFAULT_PUBLIC_BASE)
    .replace(/https?:\/\/127\.0\.0\.1(?::\d+)?/gi, DEFAULT_PUBLIC_BASE);

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  const configured = (process.env.PUBLIC_BASE_URL || DEFAULT_PUBLIC_BASE).replace(/\/$/, '');
  const path = value.startsWith('/') ? value : `/${value}`;

  if (configured) return `${configured}${path}`;

  if (req) {
    const host = req.get('host');
    const protocol = req.protocol || 'http';
    return `${protocol}://${host}${path}`;
  }

  return path;
}

module.exports = {
  resolveMediaUrl,
};
