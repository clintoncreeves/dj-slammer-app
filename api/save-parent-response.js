import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Saving parent response...');
    const { answers, timestamp } = req.body;

    // Generate a unique ID for this parent response
    const responseId = `parent-response:${Date.now()}`;
    console.log('Generated response ID:', responseId);

    // Save to KV
    await kv.set(responseId, {
      answers,
      timestamp: timestamp || new Date().toISOString(),
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
