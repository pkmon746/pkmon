// Wallet Connection Handler
class WalletConnector {
    constructor() {
        this.currentAccount = null;
        this.provider = null;
        this.chainId = 143; // Monad Mainnet

        // ✅ BUG1 FIX: 명시적 로그아웃 플래그 (sessionStorage)
        this.LOGOUT_FLAG = 'pkmon_user_logged_out';

        this.init();
    }

    init() {
        const connectBtn = document.getElementById('connectWalletBtn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                if (this.currentAccount) {
                    this.showLogoutModal();
                } else {
                    this.connectWallet();
                }
            });
        }
        this.checkConnection();
        this.initLogoutModal();
    }

    async checkConnection() {
        // ✅ FIX: 명시적 로그아웃 상태면 자동연결 완전 차단
        if (sessionStorage.getItem(this.LOGOUT_FLAG) === 'true') {
            console.log('[Wallet] 로그아웃 상태 - 자동 재연결 차단');
            this.currentAccount = null;
            this.updateUI();
            return;
        }

        // ✅ FIX: localStorage 기반 "사이트 연결 승인" 여부 확인
        // Rabby가 배경에서 계정을 노출하더라도,
        // 사용자가 이 사이트에서 직접 Connect Wallet을 누른 적이 있어야만 자동 복원
        if (localStorage.getItem('pkmon_wallet_connected') !== 'true') {
            console.log('[Wallet] 이 사이트에서 연결 승인된 적 없음 - 자동연결 건너뜀');
            this.currentAccount = null;
            this.updateUI();
            return;
        }

        // 위 두 조건을 통과한 경우만 자동 복원 (새로고침 시 연결 유지)
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    this.currentAccount = accounts[0];
                    this.updateUI();
                    console.log('[Wallet] 기존 연결 복원:', this.currentAccount.slice(0, 10) + '...');
                }
            } catch (error) {
                console.error('Error checking connection:', error);
            }
        }
    }

    async connectWallet() {
        try {
            if (typeof window.ethereum === 'undefined') {
                alert('Please install MetaMask or Rabby Wallet to continue');
                return;
            }

            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

            // ✅ FIX: 지갑 연결 시 로그아웃 플래그 제거 + 연결 승인 플래그 저장
            sessionStorage.removeItem(this.LOGOUT_FLAG);
            localStorage.setItem('pkmon_wallet_connected', 'true');

            this.currentAccount = accounts[0];
            this.provider = window.ethereum;

            await this.switchToMonad();
            this.updateUI();

            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    sessionStorage.removeItem(this.LOGOUT_FLAG);
                    localStorage.setItem('pkmon_wallet_connected', 'true');
                    this.currentAccount = accounts[0];
                    this.updateUI();
                    window.location.reload();
                } else {
                    this.currentAccount = null;
                    this.updateUI();
                }
            });

            window.ethereum.on('chainChanged', () => {
                window.location.reload();
            });

        } catch (error) {
            console.error('Error connecting wallet:', error);
            if (error.code !== 4001) {
                alert('Failed to connect wallet: ' + error.message);
            }
        }
    }

    async switchToMonad() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xA1DE' }],
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0xA1DE',
                            chainName: 'Monad Testnet',
                            nativeCurrency: { name: 'Monad', symbol: 'MONAD', decimals: 18 },
                            rpcUrls: ['https://testnet-rpc.monad.xyz'],
                            blockExplorerUrls: ['https://explorer.monad.xyz']
                        }]
                    });
                } catch (addError) {
                    console.error('Error adding Monad network:', addError);
                }
            }
        }
    }

    initLogoutModal() {
        const modalHTML = `
            <div id="walletLogoutModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; justify-content: center; align-items: center;">
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; border-radius: 20px; max-width: 400px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 2px solid rgba(255,255,255,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-sign-out-alt" style="font-size: 36px; color: white;"></i>
                        </div>
                        <h2 style="color: white; margin: 0 0 10px 0; font-size: 24px;">지갑 연결 해제</h2>
                        <p id="logoutWalletAddress" style="color: #94a3b8; font-size: 14px; margin: 0; font-family: monospace;"></p>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                        <p style="color: #cbd5e1; margin: 0; font-size: 14px; line-height: 1.6;">
                            <i class="fas fa-info-circle" style="color: #60a5fa; margin-right: 8px;"></i>
                            지갑 연결을 해제하면 결제 정보는 유지되지만, 콘텐츠에 다시 접근하려면 재연결이 필요합니다.
                        </p>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <button id="cancelLogoutBtn" style="flex: 1; padding: 14px 24px; background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: 600;">취소</button>
                        <button id="confirmLogoutBtn" style="flex: 1; padding: 14px 24px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: 600;">연결 해제</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        document.getElementById('cancelLogoutBtn').addEventListener('click', () => this.hideLogoutModal());
        document.getElementById('confirmLogoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('walletLogoutModal').addEventListener('click', (e) => {
            if (e.target.id === 'walletLogoutModal') this.hideLogoutModal();
        });
    }

    showLogoutModal() {
        const modal = document.getElementById('walletLogoutModal');
        const addressElement = document.getElementById('logoutWalletAddress');
        if (modal && this.currentAccount) {
            addressElement.textContent = `${this.currentAccount.slice(0, 10)}...${this.currentAccount.slice(-8)}`;
            modal.style.display = 'flex';
        }
    }

    hideLogoutModal() {
        const modal = document.getElementById('walletLogoutModal');
        if (modal) modal.style.display = 'none';
    }

    async logout() {
        // ✅ FIX: 로그아웃 플래그 저장 + 연결 승인 플래그 제거
        // 이후 페이지 새로고침해도 자동연결 완전 차단
        sessionStorage.setItem(this.LOGOUT_FLAG, 'true');
        localStorage.removeItem('pkmon_wallet_connected');
        this.currentAccount = null;
        this.provider = null;
        this.updateUI();
        this.hideLogoutModal();
        setTimeout(() => window.location.reload(), 300);
    }

    updateUI() {
        const connectBtn = document.getElementById('connectWalletBtn');
        if (this.currentAccount && connectBtn) {
            const shortAddress = `${this.currentAccount.slice(0, 6)}...${this.currentAccount.slice(-4)}`;
            connectBtn.innerHTML = `<i class="fas fa-check-circle"></i> ${shortAddress} <i class="fas fa-sign-out-alt" style="margin-left: 8px; opacity: 0.7; font-size: 12px;"></i>`;
            connectBtn.style.background = 'linear-gradient(135deg, #10B981, #059669)';
            connectBtn.title = '클릭하여 지갑 연결 해제';
        } else if (connectBtn) {
            connectBtn.innerHTML = '<i class="fas fa-wallet"></i> Connect Wallet';
            connectBtn.style.background = '';
            connectBtn.title = '클릭하여 지갑 연결';
        }
    }

    getAccount() {
        return this.currentAccount;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.walletConnector = new WalletConnector();
});
