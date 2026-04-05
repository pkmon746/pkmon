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
            console.log('[Wallet] MetaMask not installed');
            return;
        }

        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                this.currentAccount = accounts[0];
                this.provider = this._makeProvider();

                const network = await this.provider.getNetwork();
                if (network.chainId !== this.chainId) {
                    console.warn(`[Wallet] Wrong network: ${network.chainId}, switching to Sepolia...`);
                    await this.switchToSepolia();
                } else {
                    console.log('[Wallet] ✅ Auto-connected:', this.currentAccount);
                    this.updateUI();
                    localStorage.setItem('pkmon_wallet_connected', 'true');
                    sessionStorage.removeItem(this.LOGOUT_FLAG);
                }
            }
        } catch (error) {
            console.error('[Wallet] checkConnection error:', error);
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
            this.provider = this._makeProvider();

            console.log('[Wallet] ✅ Connected:', this.currentAccount);

            await this.switchToSepolia();

            this.updateUI();
            localStorage.setItem('pkmon_wallet_connected', 'true');
            sessionStorage.removeItem(this.LOGOUT_FLAG);

        } catch (error) {
            console.error('[Wallet] connectWallet error:', error);
            if (error.code === 4001) {
                alert('Wallet connection rejected by user');
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
            console.log('[Wallet] ✅ Switched to Sepolia Testnet');
        } catch (switchError) {
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
                    console.log('[Wallet] ✅ Sepolia added and switched');
                } catch (addError) {
                    console.error('[Wallet] Failed to add Sepolia:', addError);
                    throw addError;
                }
            } else {
                console.error('[Wallet] Chain switch failed:', switchError);
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
