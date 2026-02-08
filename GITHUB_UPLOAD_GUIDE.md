# GitHub 업로드 가이드

## ✅ 완료된 작업

1. ✅ Git 저장소 초기화
2. ✅ `.gitignore` 파일 생성
3. ✅ 모든 파일 추가 (`git add .`)
4. ✅ 초기 커밋 생성

**현재 상태:** 로컬 Git 저장소 준비 완료!

---

## 🚀 GitHub에 업로드하기

### 방법 1: GitHub Desktop 사용 (추천 - 초보자용)

1. **GitHub Desktop 다운로드**
   - https://desktop.github.com/ 에서 다운로드 및 설치

2. **GitHub 로그인**
   - GitHub Desktop 실행
   - File → Options → Sign in
   - GitHub 계정으로 로그인

3. **저장소 발행**
   - File → Add Local Repository
   - `C:\Users\pc\Desktop\pkmonad-project` 선택
   - "Publish repository" 버튼 클릭
   - 저장소 이름: `pkmonad-project`
   - Description: "Pokemon TCG Analysis Platform with 4-agent system"
   - ☐ Keep this code private (체크하면 비공개)
   - "Publish Repository" 클릭

4. **완료!**
   - GitHub.com에서 저장소 확인 가능
   - URL: `https://github.com/YOUR_USERNAME/pkmonad-project`

---

### 방법 2: 명령어 사용 (고급 사용자용)

#### 1단계: GitHub에서 새 저장소 생성

1. https://github.com/new 접속
2. Repository name: `pkmonad-project`
3. Description: "Pokemon TCG Analysis Platform with 4-agent system"
4. Public 또는 Private 선택
5. **❌ Initialize this repository with a README 체크 해제**
6. "Create repository" 클릭

#### 2단계: 로컬 저장소를 GitHub에 연결

PowerShell에서 다음 명령 실행:

```powershell
# GitHub 저장소 URL로 변경 (YOUR_USERNAME을 본인 것으로)
git remote add origin https://github.com/YOUR_USERNAME/pkmonad-project.git

# 브랜치 이름 확인/변경
git branch -M main

# GitHub에 푸시
git push -u origin main
```

#### 3단계: 인증

- **첫 푸시 시** GitHub 로그인 창이 뜰 수 있습니다
- GitHub 계정 정보 입력
- Personal Access Token 필요할 수 있음
  - Settings → Developer Settings → Personal Access Tokens
  - Generate new token (classic)
  - repo 권한 선택

---

## 📝 이후 업데이트하기

### 파일 수정 후 GitHub에 푸시

```powershell
# 변경사항 추가
git add .

# 커밋 메시지와 함께 커밋
git commit -m "Update: 수정 내용 설명"

# GitHub에 푸시
git push
```

### 자주 사용하는 명령어

```powershell
# 현재 상태 확인
git status

# 변경 이력 확인
git log --oneline

# 특정 파일만 추가
git add 파일명.js

# 마지막 커밋 메시지 수정
git commit --amend

# 원격 저장소 주소 확인
git remote -v
```

---

## ⚠️ 중요 사항

### API 키 보안

현재 `assets/config.js`에 API 키가 포함되어 있습니다!

**권장 조치:**

1. **환경 변수 사용**
   ```javascript
   // config.js 대신 환경 변수 사용
   const PSA_TOKEN = process.env.PSA_ACCESS_TOKEN;
   ```

2. **.gitignore에 추가됨**
   - `.env` 파일은 이미 .gitignore에 포함
   - API 키가 포함된 파일은 GitHub에 푸시하지 마세요

3. **이미 푸시한 경우**
   - API 키 재발급 권장
   - Git 히스토리에서 제거 필요

### 파일 크기 제한

- GitHub는 100MB 이상 파일 거부
- 큰 파일은 Git LFS 사용

---

## 🎯 다음 단계

1. ✅ GitHub 저장소 생성
2. ✅ 코드 푸시
3. ⬜ README.md 확인/업데이트
4. ⬜ GitHub Pages로 웹사이트 호스팅 (선택)
5. ⬜ Issues/Projects 설정 (선택)

---

## 📞 도움이 필요한 경우

### GitHub Desktop 오류
- 저장소 경로가 올바른지 확인
- Git이 설치되어 있는지 확인 (`git --version`)

### 푸시 실패
- 인터넷 연결 확인
- GitHub 로그인 상태 확인
- Personal Access Token 만료 확인

### 커밋 실수
```powershell
# 마지막 커밋 취소 (변경사항 유지)
git reset --soft HEAD~1

# 마지막 커밋 완전 취소 (변경사항 삭제)
git reset --hard HEAD~1
```

---

**성공적인 GitHub 업로드를 기원합니다! 🚀**

질문이 있으면 언제든지 물어보세요!
