// 🎭 DEMO MODE - PKMON Payment Gate (시연용)
// 지갑 연결 없이도 모든 기능 접근 가능

/**
 * Dashboard 접근 함수 (시연용 - 결제 확인 우회)
 * @param {string} targetUrl - 이동할 대상 URL
 */
async function handleProtectedLink(targetUrl = 'agent-dashboard.html') {
    console.log(`[DEMO MODE] 🎭 시연 모드 활성화`);
    console.log(`[DEMO MODE] 페이지 이동: ${targetUrl}`);
    console.log(`[DEMO MODE] 결제 확인 우회 - 즉시 접근 허용`);
    
    // 🎭 시연 모드: 결제 확인 없이 바로 이동
    window.location.href = targetUrl;
}

/**
 * 결제 게이트 (시연용 - 사용 안 함)
 */
async function runPaymentGate(account, targetUrl) {
    console.log('[DEMO MODE] runPaymentGate 호출 - 우회됨');
}

/**
 * 지갑 연결 알림 (시연용 - 사용 안 함)
 */
function showWalletAlert(message) {
    console.log('[DEMO MODE] showWalletAlert 호출 - 무시됨:', message);
}

/**
 * Connect Wallet 버튼 강조 (시연용 - 사용 안 함)
 */
function pulseWalletBtn() {
    console.log('[DEMO MODE] pulseWalletBtn 호출 - 무시됨');
}

/**
 * 로딩 스피너 표시 (시연용 - 사용 안 함)
 */
function showLoadingSpinner() {
    console.log('[DEMO MODE] showLoadingSpinner 호출 - 무시됨');
}

/**
 * 로딩 스피너 숨김 (시연용 - 사용 안 함)
 */
function hideLoadingSpinner() {
    console.log('[DEMO MODE] hideLoadingSpinner 호출 - 무시됨');
}

// ✅ 페이지 로드 시 자동 보호 링크 설정
document.addEventListener('DOMContentLoaded', function() {
    console.log('[DEMO MODE] 🎭 시연 모드 - Payment Gate 초기화');
    
    // 보호 대상 페이지 목록
    const protectedPages = [
        'agent-dashboard.html',
        'pokedex.html',
        'tcg-search.html',
        'pokememe.html',
        'utility.html'
    ];
    
    let totalProtected = 0;
    
    protectedPages.forEach(page => {
        const links = document.querySelectorAll(`a[href="${page}"]`);
        
        links.forEach(link => {
            link.setAttribute('href', 'javascript:void(0);');
            link.setAttribute('data-protected-page', page);
            
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetPage = this.getAttribute('data-protected-page');
                handleProtectedLink(targetPage);
            });
            
            totalProtected++;
        });
    });

    console.log(`[DEMO MODE] ${totalProtected}개의 링크 설정 완료`);
    console.log('[DEMO MODE] 모든 페이지 즉시 접근 가능');
    
    // 시연 모드 상태 출력
    setTimeout(() => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎭 [DEMO MODE] 시연 모드 활성화됨');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ 지갑 연결 없이도 모든 기능 사용 가능');
        console.log('✅ Dashboard 접근 가능');
        console.log('✅ TCG 검색 가능');
        console.log('✅ 결제 확인 우회');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠️  주의: 시연용 버전입니다');
        console.log('⚠️  실제 배포 시 원본으로 복구 필요');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }, 1000);
});

// 디버깅 헬퍼 (시연용)
window.debugPaymentStatus = function() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎭 [DEMO MODE] 현재 상태:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('모드: 시연 모드 (DEMO)');
    console.log('지갑 연결: 필요 없음');
    console.log('결제 확인: 우회됨');
    console.log('접근 제한: 없음');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
};

window.checkMyPayment = function() {
    console.log('🎭 [DEMO MODE] 결제 확인 우회 - 항상 접근 가능');
    return true;
};
