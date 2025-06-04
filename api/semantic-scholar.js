// api/semantic-scholar.js
import fetch from 'node-fetch'; // Required for Vercel Serverless Functions

export default async (req, res) => {
    // Retrieve the API key from environment variables for security
    const semanticScholarApiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;

    // Extract query and fields from the client request
    const { query, fields } = req.query;

    if (!query) {
        return res.status(400).send('Query parameter is required.');
    }

    const encodedQuery = encodeURIComponent(query);
    // Ensure limit is set correctly, for example, to 3 as indicated by the original string.
    // If 'limit' is also passed from the client, you'd extract it from req.query.
    const limit = 3; // Or parse from req.query if it's dynamic
    const encodedFields = fields ? `&fields=${encodeURIComponent(fields)}` : '';

    // CORRECTED URL CONSTRUCTION
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodedQuery}&limit=${limit}${encodedFields}`;

    try {
        const headers = {};
        if (semanticScholarApiKey) {
            headers['x-api-key'] = semanticScholarApiKey;
        }

        const response = await fetch(url, { headers });
        const data = await response.json();

        // Send the response back to the client
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Semantic Scholar proxy error:', error);
        // Ensure the error response is also JSON for consistency if the frontend expects it
        res.status(500).json({ error: 'Error fetching data from Semantic Scholar.', details: error.message });
    }
};
