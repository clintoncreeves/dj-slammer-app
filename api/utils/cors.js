/**
 * CORS Configuration for DJ Slammer API
 *
 * This utility provides controlled CORS handling with configurable allowed origins.
 * Instead of allowing all origins (*), only specific domains are permitted.
 */

// Allowed origins - add your production domains here
const ALLOWED_ORIGINS = [
  // Local development
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',

  // Vercel preview deployments (pattern matching)
  // Production domain - update this with your actual domain
  // 'https://dj-slammer.vercel.app',
  // 'https://your-custom-domain.com',
];

// Pattern for Vercel preview URLs (e.g., dj-slammer-xxx-username.vercel.app)
const VERCEL_PREVIEW_PATTERN = /^https:\/\/dj-slammer(-[a-z0-9]+)?(-[a-z0-9]+)?\.vercel\.app$/;

/**
 * Check if an origin is allowed
 * @param {string} origin - Request origin
 * @returns {boolean} Whether the origin is allowed
 */
export function isAllowedOrigin(origin) {
  if (!origin) return false;

  // Check exact matches
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  // Check Vercel preview pattern
  if (VERCEL_PREVIEW_PATTERN.test(origin)) {
    return true;
  }

  return false;
}

/**
 * Set CORS headers on response
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {string[]} methods - Allowed HTTP methods
 * @returns {boolean} Whether origin is allowed (false means request should be rejected)
 */
export function setCorsHeaders(req, res, methods = ['GET', 'POST', 'OPTIONS']) {
  const origin = req.headers.origin;

  // Always set basic CORS headers
  res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Check if origin is allowed
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin'); // Important for caching
    return true;
  }

  // For requests without origin (e.g., same-origin, curl, Postman)
  // Allow them through but don't set Access-Control-Allow-Origin
  if (!origin) {
    return true;
  }

  // Origin is not allowed
  return false;
}

/**
 * Handle preflight (OPTIONS) request
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {string[]} methods - Allowed HTTP methods
 * @returns {boolean} Whether the preflight was handled
 */
export function handlePreflight(req, res, methods = ['GET', 'POST', 'OPTIONS']) {
  if (req.method === 'OPTIONS') {
    const originAllowed = setCorsHeaders(req, res, methods);

    if (originAllowed) {
      res.status(200).end();
    } else {
      res.status(403).json({ error: 'Origin not allowed' });
    }

    return true; // Preflight was handled
  }

  return false; // Not a preflight request
}
