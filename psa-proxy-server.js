// PSA API Proxy Server with Enhanced Logging
// This server acts as a middleware between your website and PSA API
// Run with: node psa-proxy-server.js

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(cors()); // Enable CORS for ALL origins (Public Agent)
app.use(express.json());

// Serve static files (추가된 코드)
app.use(express.static('.'));

// PSA API Configuration
const PSA_API_URL = 'https://api.psacard.com/publicapi';
const PSA_TOKEN = 'C2MNdaW2IO9Xlbm1MXC0Q_ARCaVfQbkldZRsMYd6oWP8ZACXog6jzv6X7QrgyWwYRgNmU3fn5tKp99zf8lRHiugZiEsjnOl4t_EpApf7JixN7HXvzwkGUZ8jxfpYNqszBBUZsOHS0mRatl3h-KxNvyd0qHV-QuDyryiiEFMq50tdWIiqrLEdil0xGi478LrtrLfnB9kP10jBpk6_dWV_UjI6jRF9_gRwQy3meG9Bitgvpghg-1DImavKxNW_i6ojZYrCIY5DK3w3uMkniqr8DNunZxZu-2c25o7dymeXq8DqU_Wh';
const SNKRDUNK_TRADING_CARD_API = 'https://snkrdunk.com/en/v1/trading-cards';
const SNKRDUNK_SEARCH_API = 'https://snkrdunk.com/en/v1/search';
const SNKRDUNK_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function parseUsdPrice(priceText) {
    if (typeof priceText !== 'string') return null;
    const usdMatch = priceText.match(/US\s*\$\s*([\d,]+(?:\.\d+)?)/i);
    const dollarMatch = priceText.match(/\$\s*([\d,]+(?:\.\d+)?)/);
    const value = usdMatch?.[1] || dollarMatch?.[1];
    if (!value) return null;
    const parsed = parseFloat(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
}

function parseListingCount(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(0, Math.floor(value));
    }
    const text = String(value ?? '').trim();
    if (!text) return 0;
    const match = text.match(/\d+/);
    if (!match) return 0;
    const parsed = parseInt(match[0], 10);
    return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeLiveSearchCard(item, category = 'streetwear') {
    const cardId = String(item?.id ?? '').trim();
    if (!cardId) return null;

    const listingCountRaw = item?.listingCount ?? item?.allListingCount ?? '';
    const minPriceNumber = Number(item?.minPrice);
    const minPriceUsd = Number.isFinite(minPriceNumber)
        ? minPriceNumber
        : parseUsdPrice(item?.minPriceFormat ?? '');

    return {
        card_id: cardId,
        name: item?.name || cardId,
        product_number: item?.productNumber || '',
        min_price: item?.minPriceFormat || '',
        listing_count: String(listingCountRaw || ''),
        thumbnail_url: item?.thumbnailUrl || '',
        image_url: item?.thumbnailUrl || '',
        category,
        sold_count: 0,
        avg_sold_price: null,
        min_sold_price: null,
        max_sold_price: null,
        active_count: parseListingCount(listingCountRaw),
        cheapest_listing: minPriceUsd,
        is_trading_card: item?.isTradingCard === true
    };
}

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

const { execFile } = require('child_process');

// SNKRDUNK endpoint - Search via Python Bridge (DB Query)
app.get('/api/snkrdunk/search', (req, res) => {
    const { name, set, number } = req.query;

    if (!name) {
        return res.status(400).json({ success: false, error: 'Missing name parameter' });
    }

    // Clean the name parameter to remove suffixes like ':1', ':2', etc.
    const cleanName = name.split(':')[0].trim();

    console.log(`\n========================================`);
    console.log(`[SNKRDUNK Search] Original name: ${name}`);
    console.log(`[SNKRDUNK Search] Cleaned name: ${cleanName}`);

    // Execute Python script - using execFile to prevent shell injection
    // Pass Name, Set, Number to help scraper accuracy
    const args = [
        'query_snkrdunk_db.py',
        cleanName,
        set || '',
        number || ''
    ];

    execFile('python', args, (error, stdout, stderr) => {
        if (error) {
            console.error(`[SNKRDUNK Search] Exec error: ${error.message}`);
            return res.status(500).json({ success: false, error: 'Internal server error' });
        }

        try {
            const rawOutput = stdout.trim();
            // Find the last line which should be the JSON
            const jsonOutput = rawOutput.split('\n').pop();

            const result = JSON.parse(jsonOutput);
            console.log(`[SNKRDUNK Search] Result:`, result);
            console.log(`========================================\n`);

            // Check if scraper returned an error structure
            if (result.error) {
                return res.status(500).json({
                    success: false,
                    error: result.error,
                    debug_info: result.debug_info
                });
            }

            res.json(result);
        } catch (e) {
            console.error(`[SNKRDUNK Search] Parse error: ${e.message}`);
            res.status(500).json({ success: false, error: 'Failed to parse python output' });
        }
    });
});

// SNKRDUNK endpoint - On-sale used listings across all pages (price ascending)
// Example source URL:
// https://snkrdunk.com/en/v1/trading-cards/730956/used-listings?perPage=20&page=1&sortType=price_asc&isOnlyOnSale=true
app.get('/api/snkrdunk/live-search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 50);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const includeNonTrading = String(req.query.includeNonTrading || '').toLowerCase() === 'true';

    if (!q) {
        return res.status(400).json({ success: false, error: 'Missing q parameter' });
    }

    const apiUrl = `${SNKRDUNK_SEARCH_API}?keyword=${encodeURIComponent(q)}&perPage=${limit}&page=${page}&type=all`;

    console.log(`\n========================================`);
    console.log(`[SNKRDUNK Live Search] q="${q}" limit=${limit} page=${page}`);

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'User-Agent': SNKRDUNK_USER_AGENT,
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        if (!response.ok) {
            throw new Error(`SNKRDUNK search API error: HTTP ${response.status}`);
        }

        const payload = await response.json();
        const streetwears = Array.isArray(payload.streetwears) ? payload.streetwears : [];
        const sneakers = Array.isArray(payload.sneakers) ? payload.sneakers : [];

        let filtered = includeNonTrading
            ? [...streetwears, ...sneakers]
            : streetwears.filter(item => item?.isTradingCard === true);

        if (!includeNonTrading && filtered.length === 0) {
            // 일부 검색어에서 isTradingCard가 누락되는 경우를 대비한 fallback
            filtered = streetwears;
        }

        const normalized = filtered
            .map(item => normalizeLiveSearchCard(
                item,
                item?.isTradingCard === true ? 'pokemon' : 'streetwear'
            ))
            .filter(Boolean);

        console.log(`[SNKRDUNK Live Search] ✅ results=${normalized.length}`);
        console.log(`========================================\n`);

        res.json({
            success: true,
            query: q,
            page,
            limit,
            total: normalized.length,
            sourceCounts: {
                streetwearCount: Number(payload.streetwearCount || streetwears.length || 0),
                sneakerCount: Number(payload.sneakerCount || sneakers.length || 0)
            },
            data: normalized
        });
    } catch (error) {
        console.error('[SNKRDUNK Live Search] ❌ Error:', error.message);
        console.log(`========================================\n`);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/snkrdunk/on-sale/:cardId', async (req, res) => {
    const { cardId } = req.params;
    const perPage = Math.min(Math.max(parseInt(req.query.perPage || '20', 10), 1), 50);
    const maxPages = Math.min(Math.max(parseInt(req.query.maxPages || '100', 10), 1), 200);
    const sortType = 'price_asc';
    const isOnlyOnSale = 'true';

    if (!/^\d+$/.test(cardId)) {
        return res.status(400).json({ success: false, error: 'Invalid cardId' });
    }

    const startedAt = Date.now();
    const seenIds = new Set();
    const listings = [];
    let pagesFetched = 0;

    console.log(`\n========================================`);
    console.log(`[SNKRDUNK On-Sale] cardId=${cardId} perPage=${perPage} maxPages=${maxPages}`);

    try {
        for (let page = 1; page <= maxPages; page++) {
            const apiUrl = `${SNKRDUNK_TRADING_CARD_API}/${cardId}/used-listings?perPage=${perPage}&page=${page}&sortType=${sortType}&isOnlyOnSale=${isOnlyOnSale}`;
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': SNKRDUNK_USER_AGENT,
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            });

            if (!response.ok) {
                throw new Error(`SNKRDUNK API error at page ${page}: HTTP ${response.status}`);
            }

            const payload = await response.json();
            const pageItems = Array.isArray(payload.usedTradingCards) ? payload.usedTradingCards : [];
            pagesFetched = page;

            if (pageItems.length === 0) {
                break;
            }

            for (const item of pageItems) {
                if (item.isSold === true) continue;
                const dedupeKey = item.listingUID || item.id;
                if (dedupeKey == null) continue;

                const key = String(dedupeKey);
                if (seenIds.has(key)) continue;
                seenIds.add(key);

                listings.push({
                    id: item.id ?? null,
                    tradingCardId: item.tradingCardId ?? Number(cardId),
                    listingUID: item.listingUID ?? null,
                    price: item.price ?? null,
                    priceUsd: parseUsdPrice(item.price ?? ''),
                    condition: item.condition ?? null,
                    thumbnailUrl: item.thumbnailUrl ?? null,
                    isNew: item.isNew === true,
                    isSold: item.isSold === true
                });
            }

            if (pageItems.length < perPage) {
                break;
            }
        }

        listings.sort((a, b) => {
            if (a.priceUsd == null && b.priceUsd == null) return 0;
            if (a.priceUsd == null) return 1;
            if (b.priceUsd == null) return -1;
            return a.priceUsd - b.priceUsd;
        });

        const elapsedMs = Date.now() - startedAt;
        console.log(`[SNKRDUNK On-Sale] ✅ cardId=${cardId} pages=${pagesFetched} listings=${listings.length} elapsed=${elapsedMs}ms`);
        console.log(`========================================\n`);

        res.json({
            success: true,
            cardId,
            perPage,
            maxPages,
            pagesFetched,
            total: listings.length,
            sortType,
            isOnlyOnSale: true,
            data: listings,
            elapsedMs
        });
    } catch (error) {
        console.error(`[SNKRDUNK On-Sale] ❌ Error:`, error.message);
        console.log(`========================================\n`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ── SNKRDUNK Collector Data API ──────────────────────────────
// Reads data collected by the standalone snkrdunk-collector.js
let DatabaseSync = null;
try {
    ({ DatabaseSync } = require('node:sqlite'));
} catch (error) {
    console.warn('[SNKRDUNK Collector] node:sqlite unavailable. Collector DB endpoints disabled:', error.message);
}
const collectorDbPath = path.join(__dirname, 'snkrdunk.db');

function getCollectorDb() {
    if (!DatabaseSync) {
        throw new Error('Collector DB endpoint unavailable: node:sqlite is not supported in this Node runtime');
    }
    return new DatabaseSync(collectorDbPath, { readOnly: true });
}

// GET /api/snkrdunk/sold - All SOLD transactions
// GET /api/snkrdunk/sold/:cardId - SOLD for specific card
app.get('/api/snkrdunk/sold/:cardId?', (req, res) => {
    const { cardId } = req.params;
    const condition = req.query.condition || null;
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const offset = parseInt(req.query.offset || '0', 10);

    let cdb;
    try {
        cdb = getCollectorDb();

        let sql = 'SELECT s.*, m.card_name, m.full_title FROM sold_transactions s LEFT JOIN card_metadata m ON s.card_id = m.card_id WHERE 1=1';
        const params = [];

        if (cardId) {
            sql += ' AND s.card_id = ?';
            params.push(cardId);
        }
        if (condition) {
            sql += ' AND s.condition = ?';
            params.push(condition);
        }
        sql += ' ORDER BY s.first_seen_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const rows = cdb.prepare(sql).all(...params);

        // Get total count
        let countSql = 'SELECT COUNT(*) as total FROM sold_transactions WHERE 1=1';
        const countParams = [];
        if (cardId) { countSql += ' AND card_id = ?'; countParams.push(cardId); }
        if (condition) { countSql += ' AND condition = ?'; countParams.push(condition); }
        const total = cdb.prepare(countSql).get(...countParams).total;

        cdb.close();
        res.json({ success: true, total, count: rows.length, offset, data: rows });
    } catch (err) {
        try { cdb?.close(); } catch {}
        console.error('[SNKRDUNK Sold] Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/snkrdunk/listings - Active listings
// GET /api/snkrdunk/listings/:cardId - Active listings for specific card
app.get('/api/snkrdunk/listings/:cardId?', (req, res) => {
    const { cardId } = req.params;
    const condition = req.query.condition || null;
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const offset = parseInt(req.query.offset || '0', 10);

    let cdb;
    try {
        cdb = getCollectorDb();

        let sql = 'SELECT a.*, m.card_name, m.full_title FROM active_listings a LEFT JOIN card_metadata m ON a.card_id = m.card_id WHERE a.delisted_at IS NULL';
        const params = [];

        if (cardId) {
            sql += ' AND a.card_id = ?';
            params.push(cardId);
        }
        if (condition) {
            sql += ' AND a.condition = ?';
            params.push(condition);
        }
        sql += ' ORDER BY a.price_usd ASC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const rows = cdb.prepare(sql).all(...params);

        let countSql = 'SELECT COUNT(*) as total FROM active_listings WHERE delisted_at IS NULL';
        const countParams = [];
        if (cardId) { countSql += ' AND card_id = ?'; countParams.push(cardId); }
        if (condition) { countSql += ' AND condition = ?'; countParams.push(condition); }
        const total = cdb.prepare(countSql).get(...countParams).total;

        cdb.close();
        res.json({ success: true, total, count: rows.length, offset, data: rows });
    } catch (err) {
        try { cdb?.close(); } catch {}
        console.error('[SNKRDUNK Listings] Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/snkrdunk/cards - Search discovered cards by keyword
app.get('/api/snkrdunk/cards', (req, res) => {
    const q = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);

    if (!q) {
        return res.status(400).json({ success: false, error: 'Missing q parameter' });
    }

    const isAll = q.toLowerCase() === 'all';

    let cdb;
    try {
        cdb = getCollectorDb();

        // UNION: discovered_cards + card_metadata (collector로만 수집된 카드 포함)
        // "all" 검색 시 이름 필터 없이 전체 반환
        const nameFilter = isAll ? '' : "AND d.name LIKE ?";
        const nameFilter2 = isAll ? '' : "AND (m2.card_name LIKE ? OR m2.full_title LIKE ?)";
        const params = isAll ? [limit] : [`%${q}%`, `%${q}%`, `%${q}%`, limit];

        const rows = cdb.prepare(`
            SELECT
                d.card_id,
                d.name,
                d.product_number,
                d.min_price,
                d.listing_count,
                d.thumbnail_url,
                COALESCE(m.image_url, d.image_url, d.thumbnail_url) as image_url,
                d.category,
                d.last_collected_at,
                (SELECT COUNT(*) FROM sold_transactions WHERE card_id = d.card_id) as sold_count,
                (SELECT AVG(price_usd) FROM sold_transactions WHERE card_id = d.card_id) as avg_sold_price,
                (SELECT MIN(price_usd) FROM sold_transactions WHERE card_id = d.card_id) as min_sold_price,
                (SELECT MAX(price_usd) FROM sold_transactions WHERE card_id = d.card_id) as max_sold_price,
                (SELECT COUNT(*) FROM active_listings WHERE card_id = d.card_id AND delisted_at IS NULL) as active_count,
                (SELECT MIN(price_usd) FROM active_listings WHERE card_id = d.card_id AND delisted_at IS NULL) as cheapest_listing
            FROM discovered_cards d
            LEFT JOIN card_metadata m ON d.card_id = m.card_id
            WHERE d.category = 'pokemon' ${nameFilter}
            UNION
            SELECT
                m2.card_id,
                COALESCE(m2.card_name, m2.full_title) as name,
                '' as product_number,
                CAST(m2.datalayer_price AS TEXT) as min_price,
                0 as listing_count,
                '' as thumbnail_url,
                m2.image_url,
                'collector' as category,
                m2.last_scraped_at as last_collected_at,
                (SELECT COUNT(*) FROM sold_transactions WHERE card_id = m2.card_id) as sold_count,
                (SELECT AVG(price_usd) FROM sold_transactions WHERE card_id = m2.card_id) as avg_sold_price,
                (SELECT MIN(price_usd) FROM sold_transactions WHERE card_id = m2.card_id) as min_sold_price,
                (SELECT MAX(price_usd) FROM sold_transactions WHERE card_id = m2.card_id) as max_sold_price,
                (SELECT COUNT(*) FROM active_listings WHERE card_id = m2.card_id AND delisted_at IS NULL) as active_count,
                (SELECT MIN(price_usd) FROM active_listings WHERE card_id = m2.card_id AND delisted_at IS NULL) as cheapest_listing
            FROM card_metadata m2
            WHERE m2.card_id NOT IN (SELECT card_id FROM discovered_cards)
              ${nameFilter2}
            ORDER BY sold_count DESC
            LIMIT ?
        `).all(...params);

        const total = rows.length;

        cdb.close();
        res.json({ success: true, query: q, total, count: rows.length, data: rows });
    } catch (err) {
        try { cdb?.close(); } catch {}
        console.error('[SNKRDUNK Cards] Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/snkrdunk/stats - Collection statistics
app.get('/api/snkrdunk/stats', (req, res) => {
    let cdb;
    try {
        cdb = getCollectorDb();

        const cardStats = cdb.prepare(`
            SELECT
                m.card_id,
                m.card_name,
                m.full_title,
                m.image_url,
                m.datalayer_price,
                (SELECT COUNT(*) FROM sold_transactions WHERE card_id = m.card_id) as sold_count,
                (SELECT AVG(price_usd) FROM sold_transactions WHERE card_id = m.card_id) as avg_sold_price,
                (SELECT MIN(price_usd) FROM sold_transactions WHERE card_id = m.card_id) as min_sold_price,
                (SELECT MAX(price_usd) FROM sold_transactions WHERE card_id = m.card_id) as max_sold_price,
                (SELECT COUNT(*) FROM active_listings WHERE card_id = m.card_id AND delisted_at IS NULL) as active_count,
                (SELECT MIN(price_usd) FROM active_listings WHERE card_id = m.card_id AND delisted_at IS NULL) as cheapest_listing,
                m.last_scraped_at
            FROM card_metadata m
            ORDER BY m.card_name
        `).all();

        const totals = {
            totalSold: cdb.prepare('SELECT COUNT(*) as c FROM sold_transactions').get().c,
            totalActive: cdb.prepare('SELECT COUNT(*) as c FROM active_listings WHERE delisted_at IS NULL').get().c,
            totalCards: cardStats.length,
        };

        const recentLog = cdb.prepare('SELECT * FROM scrape_log ORDER BY scraped_at DESC LIMIT 5').all();

        cdb.close();
        res.json({ success: true, totals, cards: cardStats, recentLog });
    } catch (err) {
        try { cdb?.close(); } catch {}
        console.error('[SNKRDUNK Stats] Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    console.log('[Health Check] Request received');
    res.json({ status: 'ok', message: 'PSA Proxy Server is running', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 PSA Proxy Server running on http://localhost:${PORT}`);
    console.log(`📡 PSA endpoint: http://localhost:${PORT}/api/psa/cert/{certNumber}`);
    console.log(`🎴 SNKRDUNK ID endpoint: http://localhost:${PORT}/api/snkrdunk/id/{cardId} (NO Puppeteer!)`);
    console.log(`🔍 SNKRDUNK Search endpoint: http://localhost:${PORT}/api/snkrdunk/search?name=Gengar`);
    console.log(`🧭 SNKRDUNK Live Search: http://localhost:${PORT}/api/snkrdunk/live-search?q=pikachu&limit=20`);
    console.log(`🛍️ SNKRDUNK On-Sale endpoint: http://localhost:${PORT}/api/snkrdunk/on-sale/:cardId`);
    console.log(`💰 SNKRDUNK Sold: http://localhost:${PORT}/api/snkrdunk/sold/:cardId`);
    console.log(`📋 SNKRDUNK Listings: http://localhost:${PORT}/api/snkrdunk/listings/:cardId`);
    console.log(`📊 SNKRDUNK Stats: http://localhost:${PORT}/api/snkrdunk/stats`);
    console.log(`📊 CSV endpoint: http://localhost:${PORT}/api/pricecharting/csv`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
    console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
});
