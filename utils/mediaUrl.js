'use strict';

/**
 * Build a public absolute URL for a stored upload path.
 */
function resolveMediaUrl(req, relativePath) {
  if (!relativePath) return null;
  if (String(relativePath).startsWith('http://') || String(relativePath).startsWith('https://')) {
    return relativePath;
  }

  const configured = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

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
