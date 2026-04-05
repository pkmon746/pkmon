// Wallet Connection Handler - Sepolia Testnet
// Fixed: ethers.js lazy-load guard so wallet works regardless of script order

class WalletConnector {
    constructor() {
        this.currentAccount = null;
        this.provider = null;
        this.chainId = 11155111; // Sepolia Testnet
        this.chainIdHex = '0xaa36a7';
        this.LOGOUT_FLAG = 'pkmon_user_logged_out';

        console.log('[Wallet] 🔗 Sepolia Testnet wallet init');
        this.init();
    }

    // ── ethers guard: ensure ethers is loaded before use ─────
    _getEthers() {
        if (typeof window.ethers !== 'undefined') return window.ethers;
        if (typeof ethers !== 'undefined') return ethers;
        throw new Error('ethers.js is not loaded. Make sure ethers.min.js is included before wallet.js');
    }

    _makeProvider() {
        return new (this._getEthers()).providers.Web3Provider(window.ethereum);
    }

    init() {
        const connectBtn = document.getElementById('connectWalletBtn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.connectWallet());
        }

        this.initLogoutModal();
        this.checkConnection();

        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                console.log('[Wallet] accounts changed:', accounts);
                if (accounts.length === 0) {
                    this.handleDisconnect();
                } else {
                    this.currentAccount = accounts[0];
                    this.updateUI();
                }
            });

            window.ethereum.on('chainChanged', () => {
                console.log('[Wallet] chain changed, reloading...');
                window.location.reload();
            });
        }
    }

    async checkConnection() {
        if (sessionStorage.getItem(this.LOGOUT_FLAG) === 'true') {
            console.log('[Wallet] Logged out — skipping auto-connect');
            return;
        }

        if (!window.ethereum) {
            console.log('[Wallet] MetaMask/Rabby not installed');
            return;
        }

        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length === 0) return;

            this.currentAccount = accounts[0];

            // 현재 체인 확인
            const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });

            if (currentChainId !== this.chainIdHex) {
                console.warn(`[Wallet] Wrong chain (${currentChainId}), auto-switching to Sepolia...`);
                try {
                    await this.switchToSepolia();
                } catch (e) {
                    // 사용자가 거절하거나 전환 실패 시에도 UI는 업데이트
                    console.warn('[Wallet] Auto-switch failed:', e.message);
                }
            }

            // 전환 후 provider 새로 생성
            this.provider = this._makeProvider();
            console.log('[Wallet] ✅ Auto-connected:', this.currentAccount);
            this.updateUI();
            localStorage.setItem('pkmon_wallet_connected', 'true');
            sessionStorage.removeItem(this.LOGOUT_FLAG);

        } catch (error) {
            console.error('[Wallet] checkConnection error:', error);
        }
    }

    async connectWallet() {
        if (!window.ethereum) {
            alert('Please install MetaMask or Rabby Wallet first.\nhttps://metamask.io/download/');
            window.open('https://metamask.io/download/', '_blank');
            return;
        }

        const btn = document.getElementById('connectWalletBtn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
            btn.disabled = true;
        }

        try {
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            this.currentAccount = accounts[0];
            console.log('[Wallet] ✅ Connected:', this.currentAccount);

            // Sepolia로 자동 전환
            await this.switchToSepolia();

            // 전환 후 provider 생성
            this.provider = this._makeProvider();

            this.updateUI();
            localStorage.setItem('pkmon_wallet_connected', 'true');
            sessionStorage.removeItem(this.LOGOUT_FLAG);

        } catch (error) {
            console.error('[Wallet] connectWallet error:', error);
            // 사용자 거절은 조용히 처리
            if (error.code !== 4001) {
                console.error('[Wallet] Unexpected error:', error.message);
            }
            // UI 원상복구
            if (btn) {
                btn.innerHTML = '<i class="fas fa-wallet"></i> Connect Wallet';
                btn.disabled = false;
                btn.style.background = '';
                btn.onclick = () => this.connectWallet();
            }
        }
    }

    async switchToSepolia() {
        if (!window.ethereum) return;

        const SEPOLIA_PARAMS = {
            chainId: this.chainIdHex,          // '0xaa36a7'
            chainName: 'Sepolia Testnet',
            nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: [
                'https://rpc.sepolia.org',
                'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
                'https://rpc2.sepolia.org'
            ],
            blockExplorerUrls: ['https://sepolia.etherscan.io']
        };

        // 현재 체인 확인 — 이미 Sepolia면 바로 리턴
        try {
            const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (currentChainId === this.chainIdHex) {
                console.log('[Wallet] ✅ Already on Sepolia');
                return;
            }
        } catch (_) {}

        // Step 1: wallet_addEthereumChain 먼저 시도
        // → Rabby / MetaMask 모두 체인이 이미 있으면 이 단계에서 switch까지 처리
        // → 없으면 추가 후 switch
        try {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [SEPOLIA_PARAMS],
            });
            console.log('[Wallet] ✅ Sepolia added/switched via addEthereumChain');
            return;
        } catch (addError) {
            // 사용자가 거절(4001)한 경우
            if (addError.code === 4001) {
                console.warn('[Wallet] User rejected chain add');
                throw addError;
            }
            console.warn('[Wallet] addEthereumChain failed, trying switchEthereumChain...', addError.message);
        }

        // Step 2: addEthereumChain이 안 되면 switchEthereumChain fallback
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: this.chainIdHex }],
            });
            console.log('[Wallet] ✅ Switched to Sepolia via switchEthereumChain');
        } catch (switchError) {
            console.error('[Wallet] Both add and switch failed:', switchError);
            throw switchError;
        }
    }

    updateUI() {
        const connectBtn = document.getElementById('connectWalletBtn');
        if (connectBtn && this.currentAccount) {
            const shortAddress = `${this.currentAccount.slice(0, 6)}...${this.currentAccount.slice(-4)}`;
            connectBtn.innerHTML = `<i class="fas fa-wallet"></i> ${shortAddress}`;
            connectBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
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

        console.log('[Wallet] Disconnected');
    }

    showLogoutModal() {
        const modal = document.getElementById('logoutModal');
        if (modal) modal.style.display = 'flex';
    }

    initLogoutModal() {
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

        const modal = document.getElementById('logoutModal');
        const cancelBtn = document.getElementById('cancelLogout');
        const confirmBtn = document.getElementById('confirmLogout');

        if (cancelBtn) {
            cancelBtn.onclick = () => { modal.style.display = 'none'; };
        }

        if (confirmBtn) {
            confirmBtn.onclick = () => {
                modal.style.display = 'none';
                this.handleDisconnect();
                const protectedPages = ['agent-dashboard.html', 'train.html'];
                const currentPage = window.location.pathname.split('/').pop();
                if (protectedPages.includes(currentPage)) {
                    window.location.href = 'index.html';
                } else {
                    window.location.reload();
                }
            };
        }

        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) modal.style.display = 'none';
            };
        }
    }
}

// Global instance — safe to init here; ethers is only needed at call time, not at class-definition time
window.addEventListener('DOMContentLoaded', () => {
    window.walletConnector = new WalletConnector();
});
