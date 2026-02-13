// ✅ PKMON Payment Gate - 모든 페이지에서 사용하는 결제 확인 로직
// 이 스크립트는 모든 HTML 페이지에 포함되어야 합니다

/**
 * Dashboard 접근 전 결제 확인 함수
 * @param {string} targetUrl - 이동할 대상 URL (기본값: 'agent-dashboard.html')
 */
async function handleProtectedLink(targetUrl = 'agent-dashboard.html') {
    console.log(`[PKMON Payment Gate] 페이지 접근 시도: ${targetUrl}`);
    
    // ✅ FIX: 사이트에서 명시적으로 연결 승인된 지갑만 허용
    // eth_accounts / eth_requestAccounts 직접 호출 금지
    // → walletConnector.currentAccount 만을 단일 진실 출처로 사용

    // 1. 로그아웃 상태 체크
    if (sessionStorage.getItem('pkmon_user_logged_out') === 'true') {
        showWalletAlert('먼저 지갑을 연결해주세요!\n우측 상단 "Connect Wallet" 버튼을 클릭하세요.');
        pulseWalletBtn();
        return;
    }

    // 2. 이 사이트에서 Connect Wallet을 누른 적 있는지 확인
    if (localStorage.getItem('pkmon_wallet_connected') !== 'true') {
        showWalletAlert('먼저 지갑을 연결해주세요!\n우측 상단 "Connect Wallet" 버튼을 클릭하세요.');
        pulseWalletBtn();
        return;
    }

    // 3. walletConnector가 실제로 계정을 들고 있는지 확인
    const account = window.walletConnector && window.walletConnector.currentAccount;
    if (!account) {
        showWalletAlert('먼저 지갑을 연결해주세요!\n우측 상단 "Connect Wallet" 버튼을 클릭하세요.');
        pulseWalletBtn();
        return;
    }

    if (!window.pkmonPayment) {
        alert('시스템 로딩 중입니다. 새로고침(F5) 후 다시 시도해주세요.');
        return;
    }

    try {
        console.log(`[PKMON Payment Gate] 결제 확인 중... 지갑: ${account.slice(0, 10)}...`);
        
        // 결제 이력 확인 (백엔드 → 로컬 순서)
        const isPaid = await window.pkmonPayment.checkPaymentHistory(account);
        
        console.log(`[PKMON Payment Gate] 결제 상태: ${isPaid ? '✅ 결제 완료' : '❌ 미결제'}`);

        if (isPaid) {
            // 결제 완료 지갑 → 즉시 이동
            console.log(`[PKMON Payment Gate] ✅ 접근 허용 → ${targetUrl}`);
            window.location.href = targetUrl;
        } else {
            // 미결제 지갑 → 결제 게이트
            console.log('[PKMON Payment Gate] ❌ 미결제 → 결제 게이트 표시');
            await runPaymentGate(account, targetUrl);
        }
    } catch (error) {
        console.error('[PKMON Payment Gate] 오류:', error);
        alert('결제 확인 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

/**
 * 결제 게이트 - 결제 여부를 명확히 확인하고 처리
 * @param {string} account - 지갑 주소
 * @param {string} targetUrl - 결제 완료 후 이동할 URL
 */
async function runPaymentGate(account, targetUrl) {
    const payment = window.pkmonPayment;

    try {
        // 잔액 확인
        const balance = await payment.checkPKMONBalance(account);
        const balanceNum = parseFloat(balance);

        if (balanceNum < payment.paymentAmount) {
            // 잔액 부족 → 구매 안내 모달 (이동 없음)
            payment.showInsufficientBalanceModal(balanceNum.toFixed(2));
            return;
        }

        // 결제 확인 모달 → 결제 처리 → 완료 후 이동
        // showPaymentModal은 confirmPaymentBtn 클릭 시 processPayment 호출
        // processPayment 성공 후 targetUrl로 이동하도록 수정
        payment.pendingTargetUrl = targetUrl;
        payment.showPaymentModal(balanceNum.toFixed(2), account);

    } catch (error) {
        console.error('[Payment Gate] 오류:', error);
        alert('결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

/**
 * Connect Wallet 버튼 강조 효과
 */
function pulseWalletBtn() {
    const walletBtn = document.getElementById('connectWalletBtn');
    if (walletBtn) {
        walletBtn.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.6)';
        walletBtn.style.transform = 'scale(1.05)';
        walletBtn.style.transition = 'all 0.2s';
        setTimeout(() => {
            walletBtn.style.boxShadow = '';
            walletBtn.style.transform = '';
        }, 1500);
    }
}

/**
 * 지갑 연결 안내 알림 (기존 alert 대체)
 * @param {string} message - 표시할 메시지
 */
function showWalletAlert(message) {
    const existing = document.getElementById('wallet-alert-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'wallet-alert-toast';
    toast.style.cssText = `
        position: fixed; top: 80px; right: 20px;
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 2px solid rgba(239,68,68,0.5);
        border-radius: 14px; padding: 16px 20px;
        color: #fca5a5; font-size: 0.9rem; font-weight: 600;
        z-index: 99999; max-width: 300px; line-height: 1.6;
        box-shadow: 0 8px 30px rgba(239,68,68,0.3);
        animation: toastIn 0.3s ease;
    `;
    toast.innerHTML = `
        <div style="display:flex;gap:10px;align-items:flex-start;">
            <span style="font-size:1.3rem;">🔒</span>
            <span>${message.replace(/\n/g, '<br>')}</span>
        </div>
    `;
    document.body.appendChild(toast);

    // 스타일 추가
    if (!document.getElementById('toast-anim-style')) {
        const s = document.createElement('style');
        s.id = 'toast-anim-style';
        s.textContent = '@keyframes toastIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}';
        document.head.appendChild(s);
    }

    setTimeout(() => toast.remove(), 3500);
}

// ✅ 페이지 로드 시 모든 보호 대상 페이지 링크를 보호된 링크로 변환
document.addEventListener('DOMContentLoaded', function() {
    console.log('[PKMON Payment Gate] 초기화 중...');
    
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
        // 각 페이지로 직접 연결된 모든 링크 찾기
        const links = document.querySelectorAll(`a[href="${page}"]`);
        
        links.forEach(link => {
            // href를 javascript:void(0)으로 변경하고 onclick 이벤트 추가
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

    console.log(`[PKMON Payment Gate] ${totalProtected}개의 보호 대상 링크 설정 완료`);
    console.log('[PKMON Payment Gate] 보호 대상:', protectedPages.join(', '));
    
    // 디버깅 정보 출력
    debugPaymentStatus();
});

/**
 * 결제 상태 디버깅 함수 (개발자 도구에서 확인용)
 */
function debugPaymentStatus() {
    setTimeout(() => {
        const account = window.walletConnector?.currentAccount;
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 [PKMON Payment Gate] 현재 상태:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('1. 지갑 연결:', account ? `✅ ${account.slice(0, 10)}...` : '❌ 미연결');
        console.log('2. 로그아웃 플래그:', sessionStorage.getItem('pkmon_user_logged_out') || 'null');
        console.log('3. 연결 승인 플래그:', localStorage.getItem('pkmon_wallet_connected') || 'null');
        
        if (account) {
            try {
                const paidUsers = JSON.parse(localStorage.getItem('pkmon_paid_users') || '[]');
                const isPaidLocal = paidUsers.includes(account.toLowerCase());
                console.log('4. 로컬 결제 이력:', isPaidLocal ? '✅ 있음' : '❌ 없음');
                console.log('5. 저장된 결제 지갑:', paidUsers.length > 0 ? paidUsers : '없음');
            } catch (e) {
                console.log('4. 로컬 결제 이력:', '❌ 오류');
            }
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('💡 브라우저 콘솔에서 다음 명령어로 수동 확인 가능:');
        console.log('   - window.debugPaymentStatus() : 현재 상태 확인');
        console.log('   - window.checkMyPayment() : 내 지갑 결제 여부 확인');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }, 1000);
}

/**
 * 현재 연결된 지갑의 결제 상태 확인 (개발자 도구용)
 */
window.debugPaymentStatus = debugPaymentStatus;

window.checkMyPayment = async function() {
    const account = window.walletConnector?.currentAccount;
    if (!account) {
        console.log('❌ 지갑이 연결되지 않았습니다.');
        return;
    }
    
    console.log(`🔍 지갑 확인 중: ${account}`);
    
    if (!window.pkmonPayment) {
        console.log('❌ pkmonPayment 시스템이 로드되지 않았습니다.');
        return;
    }
    
    try {
        const isPaid = await window.pkmonPayment.checkPaymentHistory(account);
        console.log(`결과: ${isPaid ? '✅ 결제 완료' : '❌ 미결제'}`);
        return isPaid;
    } catch (error) {
        console.error('확인 중 오류:', error);
    }
};
