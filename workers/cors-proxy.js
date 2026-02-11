// Cloudflare Worker Script for Pokemon TCG API
// 1. Log in to Cloudflare Dashboard
// 2. Go to "Workers" and create a new service (e.g., 'pkmon-proxy')
// 3. Click "Quick Edit" and paste this code
// 4. Save and Deploy

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
                'Access-Control-Max-Age': '86400',
            },
        })
    }

    const url = new URL(request.url)
    // Forward query string (e.g. ?q=name:pikachu) to TCG API
    const targetUrl = 'https://api.pokemontcg.io/v2/cards' + url.search

    // Optional: Add your API key here if you have one
    // const API_KEY = 'YOUR_API_KEY_HERE';

    const headers = {
        'User-Agent': 'PKMONAD-Proxy/1.0',
        'Accept': 'application/json'
    }

    // if (API_KEY) headers['X-Api-Key'] = API_KEY;

    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: headers
        })

        const data = await response.text();

        return new Response(data, {
            headers: {
                'Access-Control-Allow-Origin': '*', // Allow any domain (or set to https://www.pkmon.store)
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600' // Cache for 1 hour to reduce API calls
            }
        })
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            }
        })
    }
}
