// Wallet Connection Handler - Sepolia Testnet

class WalletConnector {
    constructor() {
        this.currentAccount = null;
        this.provider = null;
        this.chainId = 11155111; // Sepolia Testnet
        this.chainIdHex = '0xaa36a7'; // 11155111 in hex
        this.LOGOUT_FLAG = 'pkmon_user_logged_out';
        
        console.log('[Wallet] 🔗 Sepolia Testnet 지갑 연결 초기화');
        this.init();
    }

    init() {
        const connectBtn = document.getElementById('connectWalletBtn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.connectWallet());
        }

        // 로그아웃 모달 초기화
        this.initLogoutModal();

        // 페이지 로드 시 자동 연결 시도
        this.checkConnection();

        // 지갑 변경 이벤트 리스너
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                console.log('[Wallet] 계정 변경됨:', accounts);
                if (accounts.length === 0) {
                    this.handleDisconnect();
                } else {
                    this.currentAccount = accounts[0];
                    this.updateUI();
                }
            });

            window.ethereum.on('chainChanged', (chainId) => {
                console.log('[Wallet] 체인 변경됨:', chainId);
                window.location.reload();
            });
        }
    }

    async checkConnection() {
        // 로그아웃 플래그 확인
        if (sessionStorage.getItem(this.LOGOUT_FLAG) === 'true') {
            console.log('[Wallet] 로그아웃 상태 - 자동 연결 건너뜀');
            return;
        }

        if (!window.ethereum) {
            console.log('[Wallet] MetaMask가 설치되지 않음');
            return;
        }

        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                this.currentAccount = accounts[0];
                this.provider = new window.ethers.providers.Web3Provider(window.ethereum);
                
                // 체인 확인
                const network = await this.provider.getNetwork();
                if (network.chainId !== this.chainId) {
                    console.warn(`[Wallet] Wrong network: ${network.chainId}, expected ${this.chainId}`);
                    await this.switchToSepolia();
                } else {
                    console.log('[Wallet] ✅ 지갑 자동 연결됨:', this.currentAccount);
                    this.updateUI();
                    localStorage.setItem('pkmon_wallet_connected', 'true');
                    sessionStorage.removeItem(this.LOGOUT_FLAG);
                }
            }
        } catch (error) {
            console.error('[Wallet] 연결 확인 실패:', error);
        }
    }

    async connectWallet() {
        if (!window.ethereum) {
            alert('Please install MetaMask or another Web3 wallet');
            window.open('https://metamask.io/download/', '_blank');
            return;
        }

        try {
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            this.currentAccount = accounts[0];
            this.provider = new window.ethers.providers.Web3Provider(window.ethereum);
            
            console.log('[Wallet] ✅ 지갑 연결 성공:', this.currentAccount);
            
            // Sepolia 체인으로 전환
            await this.switchToSepolia();
            
            this.updateUI();
            localStorage.setItem('pkmon_wallet_connected', 'true');
            sessionStorage.removeItem(this.LOGOUT_FLAG);
            
        } catch (error) {
            console.error('[Wallet] 연결 실패:', error);
            if (error.code === 4001) {
                alert('Wallet connection rejected');
            } else {
                alert('Failed to connect wallet: ' + error.message);
            }
        }
    }

    async switchToSepolia() {
        if (!window.ethereum) return;

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: this.chainIdHex }],
            });
            console.log('[Wallet] ✅ Sepolia Testnet으로 전환됨');
        } catch (switchError) {
            // 체인이 추가되지 않은 경우 (4902)
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: this.chainIdHex,
                            chainName: 'Sepolia Testnet',
                            nativeCurrency: {
                                name: 'Sepolia ETH',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            rpcUrls: ['https://rpc.sepolia.org'],
                            blockExplorerUrls: ['https://sepolia.etherscan.io']
                        }],
                    });
                    console.log('[Wallet] ✅ Sepolia Testnet 추가됨');
                } catch (addError) {
                    console.error('[Wallet] Sepolia 추가 실패:', addError);
                    throw addError;
                }
            } else {
                console.error('[Wallet] 체인 전환 실패:', switchError);
                throw switchError;
            }
        }
    }

    updateUI() {
        const connectBtn = document.getElementById('connectWalletBtn');
        if (connectBtn && this.currentAccount) {
            const shortAddress = `${this.currentAccount.slice(0, 6)}...${this.currentAccount.slice(-4)}`;
            connectBtn.innerHTML = `<i class="fas fa-wallet"></i> ${shortAddress}`;
            connectBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            
            // 클릭 시 로그아웃 모달 표시
            connectBtn.onclick = () => this.showLogoutModal();
        }
    }

    handleDisconnect() {
        this.currentAccount = null;
        this.provider = null;
        localStorage.removeItem('pkmon_wallet_connected');
        sessionStorage.setItem(this.LOGOUT_FLAG, 'true');
        
        const connectBtn = document.getElementById('connectWalletBtn');
        if (connectBtn) {
            connectBtn.innerHTML = '<i class="fas fa-wallet"></i> Connect Wallet';
            connectBtn.style.background = '';
            connectBtn.onclick = () => this.connectWallet();
        }
        
        console.log('[Wallet] 연결 해제됨');
    }

    showLogoutModal() {
        const modal = document.getElementById('logoutModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    initLogoutModal() {
        // 로그아웃 모달 HTML이 없으면 생성
        if (!document.getElementById('logoutModal')) {
            const modalHTML = `
                <div id="logoutModal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 10000; align-items: center; justify-content: center;">
                    <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 20px; padding: 2rem; max-width: 360px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.6);">
                        <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #ef4444, #dc2626); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 2rem;">⚠️</div>
                        <h3 style="color: #fff; font-size: 1.3rem; margin-bottom: 0.5rem;">Disconnect Wallet?</h3>
                        <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem;">You will need to reconnect to access protected pages</p>
                        <div style="display: flex; gap: 10px;">
                            <button id="cancelLogout" style="flex: 1; padding: 0.75rem; background: rgba(255,255,255,0.1); color: #fff; border: none; border-radius: 10px; font-size: 0.95rem; cursor: pointer; font-weight: 600;">Cancel</button>
                            <button id="confirmLogout" style="flex: 1; padding: 0.75rem; background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; border: none; border-radius: 10px; font-size: 0.95rem; cursor: pointer; font-weight: 600;">Disconnect</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        // 이벤트 리스너
        const modal = document.getElementById('logoutModal');
        const cancelBtn = document.getElementById('cancelLogout');
        const confirmBtn = document.getElementById('confirmLogout');

        if (cancelBtn) {
            cancelBtn.onclick = () => {
                modal.style.display = 'none';
            };
        }

        if (confirmBtn) {
            confirmBtn.onclick = () => {
                modal.style.display = 'none';
                this.handleDisconnect();
                
                // 현재 페이지가 보호된 페이지인 경우 홈으로 이동
                const protectedPages = ['agent-dashboard.html', 'train.html'];
                const currentPage = window.location.pathname.split('/').pop();
                if (protectedPages.includes(currentPage)) {
                    window.location.href = 'index.html';
                } else {
                    // 그 외 페이지는 새로고침
                    window.location.reload();
                }
            };
        }

        // 모달 배경 클릭 시 닫기
        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            };
        }
    }
}

// 전역 인스턴스 생성
window.addEventListener('DOMContentLoaded', () => {
    window.walletConnector = new WalletConnector();
});
