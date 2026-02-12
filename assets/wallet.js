// Wallet Connection Handler with Logout
class WalletConnector {
    constructor() {
        this.currentAccount = null;
        this.provider = null;
        this.chainId = 41454; // Monad Testnet
        this.init();
    }

    init() {
        const connectBtn = document.getElementById('connectWalletBtn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                if (this.currentAccount) {
                    // 이미 연결되어 있으면 로그아웃 모달 표시
                    this.showLogoutModal();
                } else {
                    // 연결되어 있지 않으면 지갑 연결
                    this.connectWallet();
                }
            });
        }

        // Check if already connected
        this.checkConnection();
        
        // 로그아웃 모달 초기화
        this.initLogoutModal();
    }

    async checkConnection() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({
                    method: 'eth_accounts'
                });

                if (accounts.length > 0) {
                    this.currentAccount = accounts[0];
                    this.updateUI();
                }
            } catch (error) {
                console.error('Error checking connection:', error);
            }
        }
    }

    async connectWallet() {
        try {
            // Check if MetaMask or Rabby is installed
            if (typeof window.ethereum === 'undefined') {
                alert('Please install MetaMask or Rabby Wallet to continue');
                return;
            }

            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            this.currentAccount = accounts[0];
            this.provider = window.ethereum;

            // Try to switch to Monad network
            await this.switchToMonad();

            this.updateUI();

            // Listen for account changes
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    this.currentAccount = accounts[0];
                    this.updateUI();
                    // 계정 변경 시 페이지 새로고침 (결제 상태 재확인)
                    window.location.reload();
                } else {
                    this.currentAccount = null;
                    this.updateUI();
                }
            });

            // Listen for chain changes
            window.ethereum.on('chainChanged', () => {
                window.location.reload();
            });

        } catch (error) {
            console.error('Error connecting wallet:', error);
            alert('Failed to connect wallet: ' + error.message);
        }
    }

    async switchToMonad() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xA1DE' }], // 41454 in hex
            });
        } catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0xA1DE',
                            chainName: 'Monad Testnet',
                            nativeCurrency: {
                                name: 'Monad',
                                symbol: 'MONAD',
                                decimals: 18
                            },
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

    // ============================================================
    // 🆕 로그아웃 기능
    // ============================================================
    
    initLogoutModal() {
        // 로그아웃 모달 HTML 생성
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
                        <button id="cancelLogoutBtn" style="flex: 1; padding: 14px 24px; background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: 600; transition: all 0.3s;">
                            취소
                        </button>
                        <button id="confirmLogoutBtn" style="flex: 1; padding: 14px 24px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: 600; transition: all 0.3s;">
                            연결 해제
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // 모달을 body에 추가
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 이벤트 리스너 추가
        document.getElementById('cancelLogoutBtn').addEventListener('click', () => {
            this.hideLogoutModal();
        });
        
        document.getElementById('confirmLogoutBtn').addEventListener('click', () => {
            this.logout();
        });
        
        // 모달 외부 클릭 시 닫기
        document.getElementById('walletLogoutModal').addEventListener('click', (e) => {
            if (e.target.id === 'walletLogoutModal') {
                this.hideLogoutModal();
            }
        });
    }
    
    showLogoutModal() {
        const modal = document.getElementById('walletLogoutModal');
        const addressElement = document.getElementById('logoutWalletAddress');
        
        if (modal && this.currentAccount) {
            const shortAddress = `${this.currentAccount.slice(0, 10)}...${this.currentAccount.slice(-8)}`;
            addressElement.textContent = shortAddress;
            modal.style.display = 'flex';
        }
    }
    
    hideLogoutModal() {
        const modal = document.getElementById('walletLogoutModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    async logout() {
        try {
            // 로컬 상태 초기화
            this.currentAccount = null;
            this.provider = null;
            
            // UI 업데이트
            this.updateUI();
            
            // 모달 닫기
            this.hideLogoutModal();
            
            // 페이지 새로고침 (결제 모달이 다시 나타나도록)
            setTimeout(() => {
                window.location.reload();
            }, 300);
            
        } catch (error) {
            console.error('Error during logout:', error);
        }
    }

    updateUI() {
        const connectBtn = document.getElementById('connectWalletBtn');

        if (this.currentAccount && connectBtn) {
            const shortAddress = `${this.currentAccount.slice(0, 6)}...${this.currentAccount.slice(-4)}`;
            connectBtn.innerHTML = `
                <i class="fas fa-check-circle"></i> ${shortAddress}
                <i class="fas fa-sign-out-alt" style="margin-left: 8px; opacity: 0.7; font-size: 12px;"></i>
            `;
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

// Initialize wallet connector when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.walletConnector = new WalletConnector();
});
