import { kv } from '@vercel/kv';
import { rateLimit } from './utils/rateLimit.js';

// Rate limiter: 30 requests per minute (lighter limit for GET)
const limiter = rateLimit(30, 60000);

export default async function handler(req, res) {
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
    // Get all response IDs
    const responseIds = await kv.lrange('all-responses', 0, -1);
    
    // Fetch each response
    const responses = [];
    for (const id of responseIds) {
      const response = await kv.get(id);
      if (response) {
        responses.push({ id, ...response });
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      count: responses.length,
      responses 
    });
  } catch (error) {
    console.error('Error fetching responses:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch responses',
      details: error.message 
    });
  }
}
