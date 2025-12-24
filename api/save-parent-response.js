import { kv } from '@vercel/kv';
import { rateLimit } from './utils/rateLimit.js';
import { setCorsHeaders, handlePreflight } from './utils/cors.js';

// Rate limiter: 10 requests per minute
const limiter = rateLimit(10, 60000);

export default async function handler(req, res) {
  // Handle preflight requests
  if (handlePreflight(req, res, ['POST', 'OPTIONS'])) {
    return;
  }

  // Set CORS headers for actual requests
  const originAllowed = setCorsHeaders(req, res, ['POST', 'OPTIONS']);
  if (!originAllowed && req.headers.origin) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  // Check rate limit
  if (limiter(req)) {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.'
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate Content-Type header
  const contentType = req.headers['content-type'];
  if (!contentType || !contentType.includes('application/json')) {
    return res.status(400).json({ error: 'Content-Type must be application/json' });
  }

  try {
    console.log('Saving parent response...');
    const { answers, timestamp } = req.body;

    // Validate required fields
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Request body must contain "answers" object' });
    }

    // Validate timestamp if provided
    if (timestamp && typeof timestamp !== 'string') {
      return res.status(400).json({ error: 'Timestamp must be a string' });
    }

    // Sanitize timestamp (trim and limit length)
    const sanitizedTimestamp = timestamp ? timestamp.trim().substring(0, 100) : undefined;

    // Generate a unique ID for this parent response
    const responseId = `parent-response:${Date.now()}`;
    console.log('Generated response ID:', responseId);

    // Save to KV
    await kv.set(responseId, {
      answers,
      timestamp: sanitizedTimestamp || new Date().toISOString(),
      submittedAt: new Date().toISOString()
    });
    console.log('Saved response to KV');

    // Also add to a list of all parent responses
    await kv.lpush('all-parent-responses', responseId);
    console.log('Added to parent responses list');

    return res.status(200).json({
      success: true,
      message: 'Parent response saved!',
      responseId
    });
  } catch (error) {
    console.error('Error saving parent response:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: 'Failed to save parent response',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
