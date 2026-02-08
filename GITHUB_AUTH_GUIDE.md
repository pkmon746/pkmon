# GitHub Push 인증 오류 해결 가이드

## ❌ 발생한 에러
```
remote: Permission to pkmon746/pkmon.git denied
fatal: unable to access 'https://github.com/pkmon746/pkmon.git/'
fatal: The requested URL returned error: 403
```

## 🔑 해결 방법: Personal Access Token 사용

### 1단계: GitHub에서 토큰 생성

1. GitHub 로그인 후 https://github.com/settings/tokens 접속
2. "Generate new token" → "Generate new token (classic)" 클릭
3. 토큰 설정:
   - **Note**: `pkmonad-project-push`
   - **Expiration**: 90 days (또는 원하는 기간)
   - **Select scopes**: 
     - ✅ `repo` (모든 repo 권한)
4. "Generate token" 클릭
5. **⚠️ 토큰을 복사해서 안전한 곳에 저장** (다시 볼 수 없음!)

### 2단계: Git Credential Manager 사용 (자동 저장)

PowerShell에서 실행:

```powershell
# 다시 푸시 시도
git push -u origin main

# 로그인 창이 뜨면:
# Username: pkmon746
# Password: (위에서 생성한 토큰 붙여넣기)
```

Git Credential Manager가 자동으로 토큰을 저장하므로 다음부터는 묻지 않습니다.

### 2단계 대안: URL에 토큰 포함 (빠른 방법)

```powershell
# 기존 remote 제거
git remote remove origin

# 토큰을 포함한 URL로 다시 추가
git remote add origin https://YOUR_TOKEN_HERE@github.com/pkmon746/pkmon.git

# 푸시
git push -u origin main
```

**⚠️ 주의:** 이 방법은 토큰이 Git 설정에 저장되므로 보안상 권장하지 않습니다.

---

## 🚀 더 쉬운 방법: GitHub Desktop 사용

1. GitHub Desktop 설치
2. File → Add Local Repository
3. `C:\Users\pc\Desktop\pkmonad-project` 선택
4. GitHub 계정으로 자동 로그인
5. "Publish repository" 클릭
6. Repository name: `pkmon` 입력
7. `pkmon746` 계정 선택
8. 완료!

---

## 📝 푸시 후 확인

푸시 성공 후:
```
https://github.com/pkmon746/pkmon
```
접속해서 파일들이 올라갔는지 확인하세요!

---

## 💡 다음 단계

푸시 성공 후 다음을 권장합니다:

1. **API 키 보안**
   - `assets/config.js`의 API 토큰을 환경 변수로 이동
   - 또는 저장소를 Private로 유지

2. **README 업데이트**
   - 설치 방법
   - 사용 방법
   - 스크린샷 추가

3. **GitHub Pages 활성화** (선택)
   - Settings → Pages
   - Source: Deploy from a branch
   - Branch: main, / (root)
   - 웹사이트 자동 호스팅!

---

어떤 방법을 선택하시겠어요?
1. Personal Access Token 생성 (추천)
2. GitHub Desktop 사용 (가장 쉬움)
3. 다른 방법 필요?
