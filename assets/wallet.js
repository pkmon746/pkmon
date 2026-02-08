// Wallet Connection Handler
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
            connectBtn.addEventListener('click', () => this.connectWallet());
        }

        // Check if already connected
        this.checkConnection();
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

    updateUI() {
        const connectBtn = document.getElementById('connectWalletBtn');

        if (this.currentAccount && connectBtn) {
            const shortAddress = `${this.currentAccount.slice(0, 6)}...${this.currentAccount.slice(-4)}`;
            connectBtn.innerHTML = `<i class="fas fa-check-circle"></i> ${shortAddress}`;
            connectBtn.style.background = 'linear-gradient(135deg, #10B981, #059669)';
        } else if (connectBtn) {
            connectBtn.innerHTML = '<i class="fas fa-wallet"></i> Connect Wallet';
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
