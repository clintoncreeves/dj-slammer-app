import { kv } from '@vercel/kv';
import { rateLimit } from './utils/rateLimit.js';

// Rate limiter: 10 requests per minute
const limiter = rateLimit(10, 60000);

export default async function handler(req, res) {
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
    
    // Generate a unique ID for this response
    const responseId = `response:${Date.now()}`;
    
    // Save to KV
    await kv.set(responseId, {
      answers,
      timestamp: sanitizedTimestamp || new Date().toISOString(),
      submittedAt: new Date().toISOString()
    });
    
    // Also add to a list of all responses
    await kv.lpush('all-responses', responseId);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Response saved!',
      responseId 
    });
  } catch (error) {
    console.error('Error saving response:', error);
    return res.status(500).json({ 
      error: 'Failed to save response',
      details: error.message 
    });
  }
}
