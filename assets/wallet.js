// 🎭 DEMO MODE - Wallet Connection Handler (시연용)
// 지갑 관련 모든 체크와 알림 비활성화

class WalletConnector {
    constructor() {
        this.currentAccount = '0xDEMO0000000000000000000000000000DEMO'; // 시연용 더미 주소
        this.provider = null;
        this.chainId = 11155111;
        this.LOGOUT_FLAG = 'pkmon_user_logged_out';
        
        console.log('[DEMO MODE] 🎭 Wallet 시연 모드 - 모든 체크 비활성화');
        this.init();
    }

    init() {
        const connectBtn = document.getElementById('connectWalletBtn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                console.log('[DEMO MODE] Connect Wallet 버튼 클릭 - 무시됨');
            });
        }
        // 시연 모드에서는 체크 건너뜀
        console.log('[DEMO MODE] 지갑 체크 건너뜀');
    }

    async checkConnection() {
        // 시연 모드 - 항상 연결된 것으로 처리
        console.log('[DEMO MODE] checkConnection 우회');
    }

    async connectWallet() {
        console.log('[DEMO MODE] connectWallet 호출 - 무시됨');
    }

    async switchToSepolia() {
        console.log('[DEMO MODE] switchToSepolia 호출 - 무시됨');
    }

    updateUI() {
        // UI 업데이트는 건너뜀
        console.log('[DEMO MODE] updateUI 호출 - 무시됨');
    }

    showLogoutModal() {
        console.log('[DEMO MODE] showLogoutModal 호출 - 무시됨');
    }

    initLogoutModal() {
        console.log('[DEMO MODE] initLogoutModal 호출 - 무시됨');
    }

    logout() {
        console.log('[DEMO MODE] logout 호출 - 무시됨');
    }

    setupEventListeners() {
        console.log('[DEMO MODE] setupEventListeners 호출 - 무시됨');
    }
}

// 전역 객체 생성
window.walletConnector = new WalletConnector();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🎭 [DEMO MODE] Wallet 시스템 초기화 완료');
console.log('✅ 지갑 연결 없이도 모든 기능 사용 가능');
console.log('✅ 알림 메시지 모두 비활성화');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
