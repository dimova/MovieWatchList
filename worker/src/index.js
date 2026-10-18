// Proxies OMDB requests so the API key never reaches the browser.
const OMDB_URL = 'https://www.omdbapi.com/';
const ALLOWED_ORIGINS = [
  'https://dimova.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers });
    }

    const requestUrl = new URL(request.url);
    const omdbUrl = new URL(OMDB_URL);
    for (const [key, value] of requestUrl.searchParams) {
      if (key.toLowerCase() === 'apikey') continue; // never trust a client-supplied key
      omdbUrl.searchParams.set(key, value);
    }
    omdbUrl.searchParams.set('apikey', env.OMDB_API_KEY);

    const omdbResponse = await fetch(omdbUrl.toString());
    const body = await omdbResponse.text();

    return new Response(body, {
      status: omdbResponse.status,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });
  },
};
