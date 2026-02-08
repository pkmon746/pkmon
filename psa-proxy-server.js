// PSA API Proxy Server with Enhanced Logging
// This server acts as a middleware between your website and PSA API
// Run with: node psa-proxy-server.js

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors()); // Enable CORS for your frontend
app.use(express.json());

// Serve static files (추가된 코드)
app.use(express.static('.'));

// PSA API Configuration
const PSA_API_URL = 'https://api.psacard.com/publicapi';
const PSA_TOKEN = 'C2MNdaW2IO9Xlbm1MXC0Q_ARCaVfQbkldZRsMYd6oWP8ZACXog6jzv6X7QrgyWwYRgNmU3fn5tKp99zf8lRHiugZiEsjnOl4t_EpApf7JixN7HXvzwkGUZ8jxfpYNqszBBUZsOHS0mRatl3h-KxNvyd0qHV-QuDyryiiEFMq50tdWIiqrLEdil0xGi478LrtrLfnB9kP10jBpk6_dWV_UjI6jRF9_gRwQy3meG9Bitgvpghg-1DImavKxNW_i6ojZYrCIY5DK3w3uMkniqr8DNunZxZu-2c25o7dymeXq8DqU_Wh';

// Proxy endpoint for PSA cert lookup
app.get('/api/psa/cert/:certNumber', async (req, res) => {
    const { certNumber } = req.params;

    console.log(`\n========================================`);
    console.log(`[PSA Proxy] Fetching cert: ${certNumber}`);
    console.log(`[PSA Proxy] URL: ${PSA_API_URL}/cert/GetByCertNumber/${certNumber}`);
    console.log(`[PSA Proxy] Time: ${new Date().toISOString()}`);

    try {
        const response = await fetch(
            `${PSA_API_URL}/cert/GetByCertNumber/${certNumber}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${PSA_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`[PSA Proxy] Response status: ${response.status}`);

        const text = await response.text();
        console.log(`[PSA Proxy] Raw response:`, text.substring(0, 500)); // First 500 chars

        let data;
        try {
            data = JSON.parse(text);
            console.log(`[PSA Proxy] Parsed JSON:`);
            console.log(JSON.stringify(data, null, 2));
        } catch (e) {
            console.error(`[PSA Proxy] JSON parse error:`, e.message);
            data = { error: 'Invalid JSON response', raw: text.substring(0, 200) };
        }

        if (response.ok) {
            console.log(`[PSA Proxy] ✅ Success!`);
            console.log(`[PSA Proxy] Card Name: ${data.CardName || data.Subject || data.Name || 'Not found in response'}`);
            console.log(`[PSA Proxy] All keys:`, Object.keys(data));
            console.log(`========================================\n`);
            res.json(data);
        } else {
            console.error(`[PSA Proxy] ❌ Error: ${response.status}`);
            console.log(`========================================\n`);
            res.status(response.status).json({ error: data });
        }
    } catch (error) {
        console.error(`[PSA Proxy] 💥 Exception:`, error.message);
        console.error(`[PSA Proxy] Stack:`, error.stack);
        console.log(`========================================\n`);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// PriceCharting CSV proxy endpoint
app.get('/api/pricecharting/csv', async (req, res) => {
    const csvUrl = 'https://www.pricecharting.com/price-guide/download-custom?t=e8b39b271ff62d9572736d3a6e8e8050edb53704&category=pokemon-cards';

    console.log(`\n========================================`);
    console.log(`[CSV Proxy] Fetching PriceCharting CSV`);
    console.log(`[CSV Proxy] URL: ${csvUrl}`);
    console.log(`[CSV Proxy] Time: ${new Date().toISOString()}`);

    try {
        const response = await fetch(csvUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        console.log(`[CSV Proxy] Response status: ${response.status}`);

        const text = await response.text();
        console.log(`[CSV Proxy] CSV size: ${text.length} bytes`);
        console.log(`[CSV Proxy] First 200 chars:`, text.substring(0, 200));

        if (response.ok) {
            console.log(`[CSV Proxy] ✅ Success!`);
            console.log(`========================================\n`);
            res.setHeader('Content-Type', 'text/csv');
            res.send(text);
        } else {
            console.error(`[CSV Proxy] ❌ Error: ${response.status}`);
            console.log(`========================================\n`);
            res.status(response.status).json({ error: 'Failed to fetch CSV' });
        }
    } catch (error) {
        console.error(`[CSV Proxy] 💥 Exception:`, error.message);
        console.log(`========================================\n`);
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    console.log('[Health Check] Request received');
    res.json({ status: 'ok', message: 'PSA Proxy Server is running', timestamp: new Date().toISOString() });
});

//const PORT = 3000;
//app.listen(PORT, () => {
    //console.log(`\n🚀 PSA Proxy Server running on http://localhost:${PORT}`);
    //console.log(`📡 Proxy endpoint: http://localhost:${PORT}/api/psa/cert/{certNumber}`);
    //console.log(`❤️  Health check: http://localhost:${PORT}/health`);
    //console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
//});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 PSA Proxy Server running on port ${PORT}`);
    console.log(`📡 Proxy endpoint: /api/psa/cert/{certNumber}`);
    console.log(`❤️  Health check: /health`);
    console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
});
