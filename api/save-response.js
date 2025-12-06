import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { answers, timestamp } = req.body;
    
    // Generate a unique ID for this response
    const responseId = `response:${Date.now()}`;
    
    // Save to KV
    await kv.set(responseId, {
      answers,
      timestamp: timestamp || new Date().toISOString(),
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
