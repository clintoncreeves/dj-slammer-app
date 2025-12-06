import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all parent response IDs
    const responseIds = await kv.lrange('all-parent-responses', 0, -1);

    // Handle case where list doesn't exist yet or is empty
    if (!responseIds || responseIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        responses: []
      });
    }

    // Fetch each parent response
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
    console.error('Error fetching parent responses:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch parent responses',
      details: error.message
    });
  }
}
