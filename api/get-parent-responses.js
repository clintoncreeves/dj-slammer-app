import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
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
