// ============================================================
// PKMON Payment Backend Server
// SQLite 데이터베이스 기반 결제 추적
// ============================================================

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();

// CORS 설정 (프론트엔드 도메인 허용)
app.use(cors({
    origin: '*', // 프로덕션에서는 실제 도메인으로 변경 필요
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());

// SQLite 데이터베이스 초기화
const dbPath = path.join(__dirname, 'pkmon_payments.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ 데이터베이스 연결 실패:', err);
        process.exit(1);
    }
    console.log('✅ SQLite 데이터베이스 연결 성공:', dbPath);
});

// 테이블 생성
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            wallet_address TEXT UNIQUE NOT NULL,
            tx_hash TEXT NOT NULL,
            amount REAL NOT NULL,
            timestamp INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('❌ 테이블 생성 실패:', err);
        } else {
            console.log('✅ payments 테이블 준비 완료');
        }
    });

    // 인덱스 생성 (검색 속도 향상)
    db.run(`
        CREATE INDEX IF NOT EXISTS idx_wallet_address 
        ON payments(wallet_address)
    `);
});

// ─────────────────────────────────────────
// API 엔드포인트
// ─────────────────────────────────────────

// 1. 헬스체크
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'PKMON Payment Tracker',
        timestamp: Date.now()
    });
});

// 2. 결제 이력 확인 (GET /api/check-payment/:address)
app.get('/api/check-payment/:address', (req, res) => {
    const address = req.params.address.toLowerCase().trim();

    if (!address || !address.startsWith('0x')) {
        return res.status(400).json({ error: 'Invalid wallet address' });
    }

    db.get(
        'SELECT * FROM payments WHERE wallet_address = ?',
        [address],
        (err, row) => {
            if (err) {
                console.error('❌ DB 조회 오류:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            res.json({
                address: address,
                hasPaid: !!row,
                payment: row ? {
                    txHash: row.tx_hash,
                    amount: row.amount,
                    paidAt: row.created_at
                } : null
            });
        }
    );
});

// 3. 결제 기록 (POST /api/record-payment)
app.post('/api/record-payment', (req, res) => {
    const { address, txHash, amount, timestamp } = req.body;

    // 필수 필드 검증
    if (!address || !txHash || !amount) {
        return res.status(400).json({ 
            error: 'Missing required fields',
            required: ['address', 'txHash', 'amount']
        });
    }

    const normalizedAddress = address.toLowerCase().trim();

    // 지갑 주소 형식 검증
    if (!normalizedAddress.startsWith('0x') || normalizedAddress.length !== 42) {
        return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    // DB에 저장 (중복 방지: UNIQUE 제약)
    db.run(
        `INSERT OR REPLACE INTO payments 
         (wallet_address, tx_hash, amount, timestamp) 
         VALUES (?, ?, ?, ?)`,
        [normalizedAddress, txHash, amount, timestamp || Date.now()],
        function(err) {
            if (err) {
                console.error('❌ DB 저장 오류:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            console.log(`✅ 결제 기록됨: ${normalizedAddress} - ${amount} PKMON (TX: ${txHash.slice(0, 10)}...)`);

            res.json({
                success: true,
                address: normalizedAddress,
                txHash: txHash,
                recordId: this.lastID
            });
        }
    );
});

// 4. 모든 결제 목록 조회 (GET /api/payments/all) - 관리자용
app.get('/api/payments/all', (req, res) => {
    // 프로덕션에서는 인증 필요!
    // if (!req.headers.authorization) return res.status(401).json({ error: 'Unauthorized' });

    db.all(
        'SELECT * FROM payments ORDER BY created_at DESC',
        [],
        (err, rows) => {
            if (err) {
                console.error('❌ DB 조회 오류:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            res.json({
                total: rows.length,
                payments: rows
            });
        }
    );
});

// 5. 결제 통계 (GET /api/stats)
app.get('/api/stats', (req, res) => {
    db.get(
        `SELECT 
            COUNT(*) as total_payments,
            SUM(amount) as total_amount,
            MIN(created_at) as first_payment,
            MAX(created_at) as last_payment
         FROM payments`,
        [],
        (err, row) => {
            if (err) {
                console.error('❌ 통계 조회 오류:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            res.json({
                totalPayments: row.total_payments || 0,
                totalAmount: row.total_amount || 0,
                firstPayment: row.first_payment,
                lastPayment: row.last_payment
            });
        }
    );
});

// ─────────────────────────────────────────
// 베팅 트래킹 API (추가)
// ─────────────────────────────────────────

// 베팅 기록 테이블 생성
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS bets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            address TEXT NOT NULL,
            team TEXT NOT NULL,
            amount REAL NOT NULL,
            txHash TEXT,
            battle_id TEXT NOT NULL,
            timestamp INTEGER NOT NULL
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS battle_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            battle_id TEXT NOT NULL UNIQUE,
            winning_team TEXT NOT NULL,
            pokemon_a TEXT NOT NULL,
            pokemon_b TEXT NOT NULL,
            timestamp INTEGER NOT NULL
        )
    `);
});

// 베팅 기록
app.post('/api/record-bet', (req, res) => {
    const { address, team, amount, txHash, battle_id, timestamp } = req.body;
    if (!address || !team || !amount || !battle_id) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    db.run(
        'INSERT INTO bets (address, team, amount, txHash, battle_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [address.toLowerCase(), team, amount, txHash || null, battle_id, timestamp || Date.now()],
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            console.log(`[Bet] Record: ${address} | Team ${team} | ${amount} PKMON`);
            res.json({ success: true });
        }
    );
});

// 배틀 결과 기록
app.post('/api/battle-result', (req, res) => {
    const { battle_id, winning_team, pokemon_a, pokemon_b, timestamp } = req.body;
    if (!battle_id || !winning_team || !pokemon_a || !pokemon_b) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    db.run(
        'INSERT OR IGNORE INTO battle_results (battle_id, winning_team, pokemon_a, pokemon_b, timestamp) VALUES (?, ?, ?, ?, ?)',
        [battle_id, winning_team, pokemon_a, pokemon_b, timestamp || Date.now()],
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            console.log(`[Battle] Result: ${battle_id} | Winning Team: ${winning_team}`);
            res.json({ success: true, battle_id, winning_team });
        }
    );
});

// 베팅 이력 조회
app.get('/api/bet-history/:address', (req, res) => {
    const address = req.params.address.toLowerCase();
    db.all(`
        SELECT b.*, br.winning_team, br.pokemon_a, br.pokemon_b,
            CASE
                WHEN br.winning_team IS NULL THEN 'pending'
                WHEN b.team = br.winning_team THEN 'win'
                ELSE 'lose'
            END AS result
        FROM bets b
        LEFT JOIN battle_results br ON b.battle_id = br.battle_id
        WHERE b.address = ?
        ORDER BY b.timestamp DESC LIMIT 50
    `, [address], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ address, history: rows });
    });
});

// 페이아웃 API
app.post('/api/payout', async (req, res) => {
    const { to, amount } = req.body;
    
    console.log('[Payout] Request received:', { to, amount });
    
    if (!to || !amount) {
        console.error('[Payout] ❌ Missing required fields');
        return res.status(400).json({ error: 'Missing required fields: to, amount' });
    }

    // Validate wallet address
    if (!to.startsWith('0x') || to.length !== 42) {
        console.error('[Payout] ❌ Invalid wallet address format:', to);
        return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    const PAYOUT_PRIVATE_KEY = process.env.PAYOUT_PRIVATE_KEY;
    const MONAD_RPC = process.env.MONAD_RPC || 'https://rpc2.monad.xyz';
    const TOKEN_ADDRESS = '0x39D691612Ef8B4B884b0aA058f41C93d6B527777';
    const ERC20_ABI = [
        { "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "name": "", "type": "uint8" }], "type": "function" },
        { "constant": false, "inputs": [{ "name": "_to", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "transfer", "outputs": [{ "name": "", "type": "bool" }], "type": "function" }
    ];

    if (!PAYOUT_PRIVATE_KEY) {
        console.error('[Payout] ❌ PAYOUT_PRIVATE_KEY environment variable not set');
        return res.status(500).json({ 
            error: 'Payout wallet not configured. Please set PAYOUT_PRIVATE_KEY in environment variables.' 
        });
    }

    try {
        const { ethers } = require('ethers');
        console.log('[Payout] Connecting to RPC:', MONAD_RPC);
        
        const provider = new ethers.providers.JsonRpcProvider(MONAD_RPC);
        const wallet = new ethers.Wallet(PAYOUT_PRIVATE_KEY, provider);
        
        console.log('[Payout] Wallet address:', wallet.address);
        
        const contract = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, wallet);
        const decimals = await contract.decimals();
        
        console.log('[Payout] Token decimals:', decimals);
        
        const amountWei = ethers.utils.parseUnits(amount.toString(), decimals);
        
        console.log('[Payout] Transfer starting:', {
            to,
            amount: amount.toString(),
            amountWei: amountWei.toString()
        });
        
        const tx = await contract.transfer(to, amountWei, {
            gasLimit: 100000 // Explicit gas limit
        });
        
        console.log('[Payout] Transaction submitted:', tx.hash);
        console.log('[Payout] Waiting for confirmation...');
        
        const receipt = await tx.wait();
        
        console.log(`[Payout] ✅ Complete! ${amount} PKMON → ${to} | TX: ${tx.hash}`);
        console.log('[Payout] Gas used:', receipt.gasUsed.toString());
        
        res.json({ 
            success: true, 
            txHash: tx.hash,
            amount: amount,
            to: to,
            gasUsed: receipt.gasUsed.toString()
        });
    } catch (error) {
        console.error('[Payout] ❌ Failed:', error);
        console.error('[Payout] Error stack:', error.stack);
        
        // Provide detailed error messages based on error type
        let errorMessage = error.message;
        
        if (error.code === 'INSUFFICIENT_FUNDS') {
            errorMessage = 'Insufficient funds in payout wallet';
        } else if (error.code === 'NETWORK_ERROR') {
            errorMessage = 'Network connection failed. Please try again.';
        } else if (error.reason) {
            errorMessage = error.reason;
        }
        
        res.status(500).json({ 
            error: errorMessage,
            details: error.code || 'UNKNOWN_ERROR'
        });
    }
});


// ─────────────────────────────────────────
// 서버 시작
// ─────────────────────────────────────────
const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('🚀 PKMON Payment API Server');
    console.log('═══════════════════════════════════════════');
    console.log(`📡 서버 주소: http://localhost:${PORT}`);
    console.log(`💾 데이터베이스: ${dbPath}`);
    console.log('');
    console.log('📍 API 엔드포인트:');
    console.log(`   GET  /api/health`);
    console.log(`   GET  /api/check-payment/:address`);
    console.log(`   POST /api/record-payment`);
    console.log(`   GET  /api/payments/all`);
    console.log(`   GET  /api/stats`);
    console.log('═══════════════════════════════════════════');
    console.log('');
});

// 우아한 종료 처리
process.on('SIGINT', () => {
    console.log('\n🛑 서버 종료 중...');
    db.close((err) => {
        if (err) {
            console.error('❌ DB 종료 오류:', err);
        } else {
            console.log('✅ 데이터베이스 연결 종료');
        }
        process.exit(0);
    });
});
