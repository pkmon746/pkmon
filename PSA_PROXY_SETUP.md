# PSA API 프록시 서버 설치 및 실행 가이드

## 🎯 문제 해결

PSA API는 보안상의 이유로 **클라이언트 사이드(브라우저)에서 직접 호출할 수 없습니다**.

해결책: **서버사이드 프록시**를 통해 안전하게 API 호출

---

## 📦 설치 방법

### 1. Node.js 설치 확인

터미널에서 확인:
```bash
node --version
npm --version
```

Node.js가 없다면 https://nodejs.org/ 에서 설치

### 2. 의존성 패키지 설치

프로젝트 폴더에서 실행:
```bash
cd c:\Users\pc\Desktop\pkmonad-project
npm install
```

설치되는 패키지:
- `express`: 웹 서버 프레임워크
- `cors`: CORS 처리
- `node-fetch`: HTTP 요청

---

## 🚀 서버 실행

### 터미널에서 실행:
```bash
npm start
```

또는:
```bash
node psa-proxy-server.js
```

### 성공 메시지:
```
🚀 PSA Proxy Server running on http://localhost:3000
📡 Proxy endpoint: http://localhost:3000/api/psa/cert/{certNumber}
```

---

## 🔧 웹사이트 연동

`assets/agents.js` 파일 수정:

```javascript
// 기존 코드 (62-64번 줄):
const response = await fetch(`${this.psaApiUrl}/cert/GetByCertNumber/${certNumber}`, {

// 변경후 코드:
const response = await fetch(`http://localhost:3000/api/psa/cert/${certNumber}`, {
```

**중요**: Authorization 헤더는 제거 (서버에서 처리)

```javascript
// 변경 전:
headers: {
    'Authorization': `Bearer ${this.psaToken}`,
    'Content-Type': 'application/json'
}

// 변경 후:
headers: {
    'Content-Type': 'application/json'
}
```

---

## ✅ 테스트

1. **프록시 서버 실행** (위 단계)
2. **브라우저에서 테스트**:
   - http://localhost:3000/health (서버 상태 확인)
   - http://localhost:3000/api/psa/cert/12345678 (실제 CERT 번호)
3. **Agent Dashboard 테스트**:
   - `agent-dashboard.html` 열기
   - CERT 번호 입력 후 "Start Analysis"
   - 실제 PSA 데이터 확인!

---

## 🎨 대안: 현재 상태 유지

프록시 서버 설정이 복잡하다면, **현재 상태로도 충분히 작동합니다**:

✅ **이미 실제 데이터 사용 중:**
- **Charizard**: PriceCharting CSV (실제 시장 가격)
- **Dragonite**: 실시간 환율 & 암호화폐 가격
- **Gengar**: SNKRDUNK 예상 가격

⚠️ **데모 모드:**
- **Sylveon**: PSA 데이터 (CORS 제한)

**결론**: Sylveon만 데모 모드이고, 핵심 기능인 가격 비교(Charizard vs Gengar)는 완벽히 작동합니다!

---

## 📝 요약

| 방법 | 장점 | 단점 |
|-----|------|------|
| **프록시 서버** | PSA API 실제 데이터 사용 | Node.js 서버 필요 |
| **현재 상태** | 설정 불필요, 즉시 사용 | Sylveon만 데모 데이터 |

**추천**: 현재 상태로 사용하고, 필요시 나중에 프록시 서버 추가
