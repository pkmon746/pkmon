# PSA API 현실적인 해결 방안

## 🔍 현재 상황

"Unknown Card" 메시지가 계속 나오는 이유:
1. 입력한 CERT 번호가 PSA 데이터베이스에 없음
2. PSA API 토큰이 만료되었을 가능성
3. PSA API가 해당 CERT에 대한 데이터를 반환하지 않음

## ✅ 권장 해결 방안 3가지

### 방안 1: PSA 웹사이트 직접 사용 (가장 확실)

**단계:**
1. https://www.psacard.com/cert/ 열기
2. CERT 번호 입력
3. 카드 정보 확인
4. 해당 정보를 Agent Dashboard에 수동으로 참고

**장점:**
- 100% 정확한 PSA 데이터
- API 토큰 불필요
- 즉시 사용 가능

---

### 방안 2: Demo 모드를 "Smart Demo"로 개선

현재 기능:
- ✅ **Charizard**: PriceCharting CSV (실제 시장 가격)
- ✅ **Dragonite**: 실시간 환율/암호화폐
- ⚠️ **Sylveon**: PSA 데모 데이터
- ✅ **Gengar**: SNKRDUNK 예상 가격

**개선안:**
Sylveon이 실제처럼 보이는 다양한 카드 데이터를 랜덤으로 표시
- Charizard, Pikachu, Mewtwo 등 다양한 카드
- 등급 8-10 랜덤
- 실제처럼 보이는 Population 수치

---

### 방안 3: PSA API 토큰 갱신 (복잡)

PSA API 문서에 따르면:
- OAuth 2 인증 필요
- PSA 로그인 필요
- 새로운 access token 생성

**과정:**
1. PSA 계정 로그인
2. API 설정에서 새 토큰 생성
3. config.js 업데이트

---

## 🎯 추천: 방안 2 (Smart Demo)

**이유:**
1. **즉시 사용 가능** - 추가 설정 불필요
2. **실용적** - Charizard가 이미 실제 가격 데이터 사용
3. **시연용으로 완벽** - 실제처럼 작동

**핵심:**
- Arbitrage 분석의 핵심은 **Charizard vs Gengar 비교**
- Charizard = 실제 PriceCharting 데이터 ✅
- Sylveon은 참고용일 뿐

---

## 📊 현재 Agent 시스템 상태

| Agent | 역할 | 데이터 소스 | 상태 |
|-------|------|------------|------|
| Sylveon | PSA 정보 | PSA API | ⚠️ CERT 필요 |
| **Charizard** | **시장 가격** | **PriceCharting CSV** | **✅ 실제 데이터** |
| Gengar | Arbitrage | SNKRDUNK (추정) | ⚠️ 추정 |
| Dragonite | 환율 | ExchangeRate API | ✅ 실시간 |

**결론:**
가장 중요한 Charizard는 이미 실제 데이터를 사용하고 있습니다!

---

## 💡 제안

**Smart Demo 모드로 개선**하시겠습니까?
- Sylveon이 다양한 카드 정보를 보여주도록 개선
- 나머지는 실제 데이터 유지
- 완전히 작동하는 arbitrage 시스템

**또는**

**현재 상태 유지**하고 실제 PSA CERT가 있을 때만 사용?
