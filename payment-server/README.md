# PKMON Payment System - 백엔드 서버 설정 가이드

## 📋 목차
1. [서버 구조](#서버-구조)
2. [로컬 개발 환경 설정](#로컬-개발-환경-설정)
3. [프로덕션 배포](#프로덕션-배포)
4. [프론트엔드 연결](#프론트엔드-연결)

---

## 🏗️ 서버 구조

```
payment-server/
├── payment-api.js                        # 백엔드 API 서버
├── pkmon-onetime-payment-backend.js      # 프론트엔드 스크립트 (백엔드 연동 버전)
├── package.json                          # Node.js 의존성
├── pkmon_payments.db                     # SQLite 데이터베이스 (자동 생성)
└── README.md
```

---

## 🚀 로컬 개발 환경 설정

### 1단계: Node.js 설치 확인
```bash
node --version  # v16 이상 필요
npm --version
```

### 2단계: 의존성 설치
```bash
cd payment-server
npm install
```

설치되는 패키지:
- `express` - 웹 서버 프레임워크
- `cors` - CORS 설정
- `sqlite3` - SQLite 데이터베이스

### 3단계: 서버 실행
```bash
npm start
```

또는 개발 모드 (자동 재시작):
```bash
npm run dev
```

서버가 성공적으로 시작되면:
```
═══════════════════════════════════════════
🚀 PKMON Payment API Server
═══════════════════════════════════════════
📡 서버 주소: http://localhost:3001
💾 데이터베이스: /path/to/pkmon_payments.db

📍 API 엔드포인트:
   GET  /api/health
   GET  /api/check-payment/:address
   POST /api/record-payment
   GET  /api/payments/all
   GET  /api/stats
═══════════════════════════════════════════
```

### 4단계: API 테스트

#### 헬스체크
```bash
curl http://localhost:3001/api/health
```

#### 결제 이력 확인
```bash
curl http://localhost:3001/api/check-payment/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

#### 결제 기록 (POST)
```bash
curl -X POST http://localhost:3001/api/record-payment \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "txHash": "0xabcd1234...",
    "amount": 10000,
    "timestamp": 1705000000000
  }'
```

#### 전체 결제 목록 조회
```bash
curl http://localhost:3001/api/payments/all
```

---

## 🌐 프로덕션 배포

### 옵션 1: VPS (Ubuntu/Debian)

#### 1. 서버에 파일 업로드
```bash
scp -r payment-server user@your-server:/home/user/
```

#### 2. 서버 접속 및 설정
```bash
ssh user@your-server
cd /home/user/payment-server
npm install --production
```

#### 3. PM2로 프로세스 관리
```bash
# PM2 설치
npm install -g pm2

# 서버 실행
pm2 start payment-api.js --name pkmon-payment

# 자동 시작 설정
pm2 startup
pm2 save

# 상태 확인
pm2 status
pm2 logs pkmon-payment
```

#### 4. Nginx 리버스 프록시 설정
```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo systemctl reload nginx
```

### 옵션 2: Render.com (무료)

1. GitHub 저장소 생성 후 `payment-server/` 폴더 푸시
2. [Render.com](https://render.com) 가입
3. New → Web Service
4. 저장소 연결
5. 설정:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
6. Create Web Service

배포 후 URL: `https://your-app.onrender.com`

### 옵션 3: Railway.app

1. [Railway.app](https://railway.app) 가입
2. New Project → Deploy from GitHub
3. 저장소 선택
4. 자동 배포 완료

---

## 🔌 프론트엔드 연결

### 1단계: 백엔드 연동 스크립트로 교체

기존 `assets/pkmon-onetime-payment.js`를 `pkmon-onetime-payment-backend.js`로 교체:

```bash
cp pkmon-onetime-payment-backend.js ../pkmon-final/assets/pkmon-onetime-payment.js
```

### 2단계: API URL 설정

`pkmon-onetime-payment.js` 파일에서 **18번째 줄** 수정:

```javascript
// 로컬 테스트
this.apiUrl = 'http://localhost:3001/api';

// 프로덕션 (실제 서버 주소로 변경!)
this.apiUrl = 'https://your-server.com/api';
```

### 3단계: CORS 설정 (프로덕션)

백엔드 `payment-api.js` 파일에서 **12-16번째 줄** 수정:

```javascript
// 개발 환경 (모든 도메인 허용)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
}));

// 프로덕션 환경 (특정 도메인만 허용)
app.use(cors({
    origin: 'https://your-frontend-domain.com', // 실제 프론트엔드 도메인
    methods: ['GET', 'POST'],
    credentials: true
}));
```

---

## ✅ 완료 체크리스트

### 백엔드 설정
- [ ] Node.js 설치 확인 (v16+)
- [ ] `npm install` 완료
- [ ] 로컬에서 `npm start` 정상 작동 확인
- [ ] API 엔드포인트 테스트 완료
- [ ] 프로덕션 서버 배포 완료
- [ ] 백엔드 URL 확인 (https://...)

### 프론트엔드 설정
- [ ] `pkmon-onetime-payment.js`에서 `apiUrl` 변경
- [ ] `receiverAddress` 실제 지갑 주소로 변경
- [ ] 프론트엔드 배포 후 결제 테스트

### 보안 설정
- [ ] CORS origin을 실제 도메인으로 제한
- [ ] HTTPS 설정 완료
- [ ] 데이터베이스 백업 설정

---

## 🔧 트러블슈팅

### 문제: "CORS policy" 오류
**원인**: 백엔드 CORS 설정 문제  
**해결**: `payment-api.js`에서 프론트엔드 도메인 허용 확인

### 문제: "Network Error" - 백엔드 연결 실패
**원인**: API URL 잘못됨 또는 서버 미작동  
**해결**: 
1. 백엔드 서버 실행 확인: `pm2 status`
2. API URL 확인: `console.log(this.apiUrl)` 출력

### 문제: 결제 이력이 사라짐
**원인**: 메모리 저장 모드로 실행 중 (SQLite 주석 처리됨)  
**해결**: `payment-api.js`에서 SQLite 코드 주석 해제 (15-29번 줄, 40-51번 줄)

---

## 📊 데이터베이스 조회

SQLite 데이터베이스 직접 확인:

```bash
sqlite3 pkmon_payments.db

# 전체 결제 목록
SELECT * FROM payments;

# 특정 지갑 조회
SELECT * FROM payments WHERE wallet_address = '0x...';

# 총 결제 금액
SELECT SUM(amount) as total FROM payments;
```

---

## 📞 지원

문제가 발생하면:
1. 로그 확인: `pm2 logs pkmon-payment`
2. API 테스트: `curl http://localhost:3001/api/health`
3. 데이터베이스 확인: `sqlite3 pkmon_payments.db`
