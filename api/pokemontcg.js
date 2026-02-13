// api/pokemontcg.js
// Vercel Serverless Function - Pokemon TCG API Proxy
// 배포 후 자동으로 /api/pokemontcg 엔드포인트로 접근 가능

export default async function handler(req, res) {
  // CORS 헤더 설정 (모든 도메인 허용)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS preflight 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q, page = 1, pageSize = 24 } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter: q' });
  }

  const tcgUrl = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`;

  try {
    const response = await fetch(tcgUrl, {
      headers: {
        'User-Agent': 'PKMONAD/1.0',
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Pokemon TCG API error: ${response.status}` 
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
