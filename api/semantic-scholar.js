// api/semantic-scholar.js
import fetch from 'node-fetch';

export default async (req, res) => {
    // Retrieve the API key from environment variables for security
    const semanticScholarApiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;

    // Extract query and fields from the client request
    const { query, fields } = req.query;

    if (!query) {
        return res.status(400).send('Query parameter is required.');
    }

    const encodedQuery = encodeURIComponent(query);
    const encodedFields = fields ? `&fields=${encodeURIComponent(fields)}` : '';
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=<span class="math-inline">\{encodedQuery\}&limit\=3</span>{encodedFields}`;

    try {
        const headers = {};
        if (semanticScholarApiKey) {
            headers['x-api-key'] = semanticScholarApiKey;
        }

        const response = await fetch(url, { headers });
        const data = await response.json();

        // Vercel's default CORS headers handle most cases.
        // If you need more specific CORS control for local dev/testing,
        // you might add headers here, but typically Vercel handles it.
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Semantic Scholar proxy error:', error);
        res.status(500).send('Error fetching data from Semantic Scholar.');
    }
};
