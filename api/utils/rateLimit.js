// Simple in-memory rate limiter for serverless functions
// Tracks requests per IP address with automatic cleanup

const rateLimitMap = new Map();

/**
 * Rate limiter middleware
 * @param {number} maxRequests - Maximum requests allowed in the time window
 * @param {number} windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns {function} Middleware function that returns true if rate limit exceeded
 */
export function rateLimit(maxRequests = 10, windowMs = 60000) {
  return (req) => {
    // Get client IP address
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.headers['x-real-ip'] ||
      req.socket?.remoteAddress ||
      'unknown';

    const now = Date.now();
    const key = `${ip}`;

    // Get or initialize rate limit data for this IP
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return false; // Not rate limited
    }

    const rateLimitData = rateLimitMap.get(key);

    // Reset if window has passed
    if (now > rateLimitData.resetTime) {
      rateLimitMap.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return false; // Not rate limited
    }

    // Increment counter
    rateLimitData.count++;

    // Check if limit exceeded
    if (rateLimitData.count > maxRequests) {
      return true; // Rate limited
    }

    return false; // Not rate limited
  };
}

/**
 * Clean up old entries from the rate limit map
 * Call this periodically to prevent memory leaks
 */
export function cleanupRateLimitMap() {
  const now = Date.now();
  for (const [key, data] of rateLimitMap.entries()) {
    if (now > data.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Auto-cleanup every 5 minutes
setInterval(cleanupRateLimitMap, 5 * 60 * 1000);
