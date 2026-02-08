# PSA API 문제 해결 가이드

## 🔍 문제 진단

Demo 모드가 계속 표시되는 주요 원인:

### 1. **CORS (Cross-Origin Resource Sharing) 차단** ⭐ 가장 가능성 높음
브라우저는 보안상의 이유로 다른 도메인의 API를 직접 호출하는 것을 차단합니다.

**증상:**
- 브라우저 콘솔에 "CORS policy" 에러 표시
- "Access-Control-Allow-Origin" 관련 에러

### 2. **API 토큰 만료 또는 무효**
제공된 PSA 토큰이 만료되었거나 권한이 없을 수 있습니다.

### 3. **브라우저 캐시**
이전 버전의 JavaScript 파일이 캐시되어 있을 수 있습니다.

---

## ✅ 해결 방법

### 즉시 테스트

1. **테스트 페이지 열기:**
   ```
   c:\Users\pc\Desktop\pkmonad-project\psa-api-test.html
   ```

2. **브라우저 콘솔 확인 (F12):**
   - Agent Dashboard 페이지에서 F12를 누르고
   - Console 탭에서 에러 메시지 확인

3. **캐시 삭제 후 새로고침:**
   - `Ctrl + Shift + R` (강력 새로고침)

### 해결 방안

#### 방안 1: CORS Proxy 사용 (임시 해결)
```javascript
// 프록시를 통해 API 호출
const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
const response = await fetch(proxyUrl + psaApiUrl, {...});
```

#### 방안 2: 서버사이드 API 호출 (권장)
Node.js/Python 백엔드를 통해 PSA API 호출
- CORS 문제 없음
- 토큰 보안 강화

#### 방안 3: PSA 데모 모드로 계속 사용
현재 설정대로 사용하면:
- Sylveon: 데모 데이터 사용
- Charizard: PriceCharting CSV (실제 데이터) ✅
- Gengar: 추정 데이터
- Dragonite: 실제 환율/암호화폐 데이터 ✅

---

## 🚀 권장 솔루션

PSA API의 CORS 문제 때문에 브라우저에서 직접 호출이 어렵습니다.

**Option A - 간단한 방법:**
현재 상태로 사용 (Charizard는 이미 실제 PriceCharting 데이터 사용 중)

**Option B - 완전한 해결:**
간단한 Node.js 백엔드 서버 추가:
```javascript
// server.js (Node.js)
const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.get('/api/psa/:cert', async (req, res) => {
  const response = await fetch(
    `https://api.psacard.com/publicapi/cert/GetByCertNumber/${req.params.cert}`,
    { headers: { 'Authorization': 'Bearer YOUR_TOKEN' } }
  );
  const data = await response.json();
  res.json(data);
});

app.listen(3000);
```

---

## 📝 다음 단계

1. **psa-api-test.html 열어서 테스트 실행**
2. **브라우저 콘솔에서 정확한 에러 확인**
3. **에러 메시지를 알려주시면 정확한 해결 방법 제시**

또는:

**현재 설정으로도 충분히 작동합니다:**
- ✅ PriceCharting CSV에서 실제 시장 가격 가져오기
- ✅ 실시간 환율 및 암호화폐 가격
- ⚠️ PSA 데이터만 데모 모드 (CORS 제한)
