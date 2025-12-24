import { kv } from '@vercel/kv';
import { rateLimit } from './utils/rateLimit.js';
import { setCorsHeaders, handlePreflight } from './utils/cors.js';

// Rate limiter: 30 requests per minute (lighter limit for GET)
const limiter = rateLimit(30, 60000);

export default async function handler(req, res) {
  // Handle preflight requests
  if (handlePreflight(req, res, ['GET', 'OPTIONS'])) {
    return;
  }

  // Set CORS headers for actual requests
  const originAllowed = setCorsHeaders(req, res, ['GET', 'OPTIONS']);
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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate that this is a GET request with no body
  if (req.body && Object.keys(req.body).length > 0) {
    return res.status(400).json({ error: 'GET request should not contain a body' });
  }

  try {
    console.log('Fetching parent responses...');

    // Get all parent response IDs
    const responseIds = await kv.lrange('all-parent-responses', 0, -1);
    console.log('Parent response IDs:', responseIds);

    // Handle case where list doesn't exist yet or is empty
    if (!responseIds || responseIds.length === 0) {
      console.log('No parent responses found');
      return res.status(200).json({
        success: true,
        count: 0,
        responses: []
      });
    }

    // Fetch each parent response
    const responses = [];
    for (const id of responseIds) {
      console.log('Fetching response:', id);
      const response = await kv.get(id);
      if (response) {
        responses.push({ id, ...response });
      }
    }

    console.log('Successfully fetched', responses.length, 'parent responses');
    return res.status(200).json({
      success: true,
      count: responses.length,
      responses
    });
  } catch (error) {
    console.error('Error fetching parent responses:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch parent responses',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
