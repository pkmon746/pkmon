# Cloudflare Worker Proxy Setup Guide

1.  **계정 생성/로그인**: [Cloudflare Dashboard](https://dash.cloudflare.com/)에 로그인합니다.
2.  **워커 생성**:
    -   좌측 메뉴에서 `Workers & Pages` -> `Create application` 클릭.
    -   `Create Worker` 클릭 -> 이름 입력 (예: `pkmon-proxy`) -> `Deploy` 클릭.
3.  **코드 붙여넣기**:
    -   방금 생성한 워커의 `Edit code` 버튼 클릭.
    -   기존 내용을 모두 지우고 `workers/cors-proxy.js` 파일의 내용을 붙여넣습니다.
    -   우측 상단 `Deploy` 클릭.
4.  **API 키 추가 (선택사항)**:
    -   `pokemontcg.io` API 키가 있다면 코드 내 `API_KEY` 변수에 입력하세요.
5.  **URL 복사**:
    -   배포 후 생성된 URL (예: `https://pkmon-proxy.yourname.workers.dev`)을 복사합니다.
6.  **프론트엔드 연결**:
    -   저에게 "URL은 `https://...` 입니다"라고 알려주시면 `tcg-search.html`에 적용해드리겠습니다.
