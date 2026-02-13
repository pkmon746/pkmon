// ============================================================
// PKMON One-Time Payment System (Production - Backend API)
// 한 번 결제한 지갑 → 영구 접근 허용
// 잔액 부족 지갑 → 구매 유도 메시지
// 미결제 지갑 → 결제 확인 모달 → 지갑 승인
// ============================================================

class PKMONOneTimePayment {
    constructor() {
        // ✅ PKMON 토큰 컨트랙트 주소 (Monad Testnet)
        this.tokenAddress = '0x39D691612Ef8B4B884b0aA058f41C93d6B527777';

        // ✅ 결제 수신 지갑 주소 - 밈코인 DEV 지갑
        this.receiverAddress = '0xdF286dC4f9bB608f05369Dcd9B105dA94107b5C9'; // TODO: 실제 밈코인 DEV 지갑 주소로 변경

        // 결제 금액 - 0.1 PKMON
        this.paymentAmount = 0.1;

        // 🔧 Backend API URL - 실제 서버 주소로 변경
        this.apiUrl = 'https://pkmon-payment-backend-api.onrender.com/api'; // ✅ Render.com 배포 URL // TODO: 실제 백엔드 서버 주소로 변경

        // ERC-20 ABI (balanceOf, decimals, transfer)
        this.erc20ABI = [
            {
                "constant": true,
                "inputs": [{ "name": "_owner", "type": "address" }],
                "name": "balanceOf",
                "outputs": [{ "name": "balance", "type": "uint256" }],
                "type": "function"
            },
            {
                "constant": true,
                "inputs": [],
                "name": "decimals",
                "outputs": [{ "name": "", "type": "uint8" }],
                "type": "function"
            },
            {
                "constant": false,
                "inputs": [
                    { "name": "_to", "type": "address" },
                    { "name": "_value", "type": "uint256" }
                ],
                "name": "transfer",
                "outputs": [{ "name": "", "type": "bool" }],
                "type": "function"
            }
        ];
    }

    // ─────────────────────────────────────────
    // 결제 이력 확인 (백엔드 우선 → 로컬 폴백)
    // ─────────────────────────────────────────
    async checkPaymentHistory(userAddress) {
        const addr = userAddress.toLowerCase();

        try {
            // ✅ 타임아웃이 있는 fetch (5초)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            // 백엔드 API 확인 시도
            const response = await fetch(`${this.apiUrl}/check-payment/${addr}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                console.log('[Payment] 백엔드 확인:', data.hasPaid);
                
                // 백엔드에 있으면 로컬에도 저장 (캐시)
                if (data.hasPaid) {
                    this.savePaymentHistoryLocal(addr);
                }
                
                return data.hasPaid;
            } else {
                console.warn(`[Payment] 백엔드 응답 오류: ${response.status}`);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('[Payment] 백엔드 타임아웃 (5초 초과), 로컬 저장소 사용');
            } else {
                console.warn('[Payment] 백엔드 연결 실패, 로컬 저장소 사용:', error.message);
            }
        }

        // 백엔드 실패 시 로컬스토리지 확인
        return this.checkPaymentHistoryLocal(addr);
    }

    // 로컬스토리지 확인 (폴백)
    checkPaymentHistoryLocal(userAddress) {
        try {
            const paidUsers = JSON.parse(localStorage.getItem('pkmon_paid_users') || '[]');
            return paidUsers.includes(userAddress.toLowerCase());
        } catch (error) {
            return false;
        }
    }

    // 로컬스토리지 저장
    savePaymentHistoryLocal(userAddress) {
        try {
            const paidUsers = JSON.parse(localStorage.getItem('pkmon_paid_users') || '[]');
            const addr = userAddress.toLowerCase();
            if (!paidUsers.includes(addr)) {
                paidUsers.push(addr);
                localStorage.setItem('pkmon_paid_users', JSON.stringify(paidUsers));
            }
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    // 백엔드에 결제 기록
    async recordPaymentBackend(userAddress, txHash, amount) {
        try {
            const response = await fetch(`${this.apiUrl}/record-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: userAddress.toLowerCase(),
                    txHash: txHash,
                    amount: amount,
                    timestamp: Date.now()
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[Payment] 백엔드 기록 성공:', data);
                return true;
            } else {
                console.warn('[Payment] 백엔드 기록 실패:', response.status);
                return false;
            }
        } catch (error) {
            console.warn('[Payment] 백엔드 기록 오류:', error.message);
            return false;
        }
    }

    // ─────────────────────────────────────────
    // 페이지 로드 시 자동 실행
    // ─────────────────────────────────────────
    async checkAccess() {
        console.log('[PKMON] 결제 시스템 초기화 완료 (0.1 PKMON)');

        // ✅ FIX: 사이트에서 명시적으로 로그아웃한 상태면 아무것도 하지 않음
        // Rabby/MetaMask가 배경에서 계정을 노출해도 무시
        if (sessionStorage.getItem('pkmon_user_logged_out') === 'true') {
            console.log('[Payment] 로그아웃 상태 - checkAccess 중단');
            return;
        }

        // ✅ FIX: walletConnector가 명시적으로 연결 승인한 계정만 사용
        // eth_accounts로 Rabby 계정을 직접 읽지 않음
        const connectedAccount = window.walletConnector && window.walletConnector.currentAccount;
        if (!connectedAccount) {
            console.log('[Payment] 사이트에 연결된 지갑 없음 - checkAccess 중단');
            return;
        }

        if (typeof window.ethereum === 'undefined') {
            return;
        }

        try {
            const userAddress = connectedAccount;
            console.log('[Payment] 연결된 지갑:', userAddress);

            // 결제 이력 확인
            const hasPaid = await this.checkPaymentHistory(userAddress);

            if (hasPaid) {
                console.log('[Payment] ✅ 결제 완료된 지갑');
                this.showAlreadyPaidMessage(userAddress);
                return;
            }

            // PKMON 잔액 확인
            const balance = await this.checkPKMONBalance(userAddress);
            const balanceFormatted = parseFloat(balance).toFixed(2);

            console.log(`[Payment] PKMON 잔액: ${balanceFormatted}`);

            if (parseFloat(balance) < this.paymentAmount) {
                console.log('[Payment] ⚠️ 잔액 부족');
                this.showInsufficientBalanceModal(balanceFormatted);
            } else {
                console.log('[Payment] 💰 잔액 충분 → 결제 모달 표시');
                this.showPaymentModal(balanceFormatted, userAddress);
            }

        } catch (error) {
            console.error('[Payment] 오류 발생:', error);
        }
    }

    // ─────────────────────────────────────────
    // PKMON 잔액 확인
    // ─────────────────────────────────────────
    // pkmon-onetime-payment.js 내 수정 부분
    async checkPKMONBalance(userAddress) {
       try {
           // ✅ 사용자의 지갑 설정과 상관없이 모나드 네트워크에서 직접 잔액 조회
           const rpcUrl = 'https://rpc2.monad.xyz'; // 모나드 메인넷 RPC (필요시 변경)
           const provider = new window.ethers.providers.JsonRpcProvider(rpcUrl);

           const contract = new window.ethers.Contract(
               this.tokenAddress,
               this.erc20ABI,
               provider 
           );

           // 해당 주소에 토큰 컨트랙트가 있는지 확인
           const code = await provider.getCode(this.tokenAddress);
           if (code === '0x') {
               console.warn('[Payment] 컨트랙트가 존재하지 않음 (네트워크 확인 필요)');
               return '0';
           }

           const decimals = await contract.decimals();
           const balance = await contract.balanceOf(userAddress);

           return window.ethers.utils.formatUnits(balance, decimals);
       } catch (error) {
           console.error('[Payment] 잔액 확인 오류:', error);
           return '0';
       }
   }

    // ─────────────────────────────────────────
    // 결제 처리
    // ─────────────────────────────────────────
    async processPayment(userAddress, targetUrl = null) {
        try {
            // ✅ [추가] 결제 진행 전 네트워크가 모나드인지 확인하고 전환 유도
            if (window.walletConnector) {
                await window.walletConnector.switchToMonad();
            }

            const provider = new window.ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            // ... (이하 동일)
            const contract = new window.ethers.Contract(
                this.tokenAddress,
                this.erc20ABI,
                signer
            );

            const decimals = await contract.decimals();
            const amount = window.ethers.utils.parseUnits(this.paymentAmount.toString(), decimals);

            console.log(`[Payment] 결제 진행: ${this.paymentAmount} PKMON → ${this.receiverAddress}`);

            const tx = await contract.transfer(this.receiverAddress, amount);
            console.log('[Payment] 트랜잭션 전송:', tx.hash);

            this.showProcessingModal(tx.hash);

            const receipt = await tx.wait();
            console.log('[Payment] ✅ 결제 완료:', receipt);

            // 백엔드에 기록 (비동기)
            await this.recordPaymentBackend(userAddress, tx.hash, this.paymentAmount);

            // 로컬에도 저장
            this.savePaymentHistoryLocal(userAddress);

            this.showSuccessModal(tx.hash, targetUrl);

        } catch (error) {
            console.error('[Payment] 결제 실패:', error);
            this.showErrorModal(error.message);
        }
    }

    // ─────────────────────────────────────────
    // UI 모달 관련 함수들
    // ─────────────────────────────────────────

    showPaymentModal(balance, userAddress) {
        const modal = document.createElement('div');
        modal.id = 'pkmonPaymentModal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; justify-content: center; align-items: center;">
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; border-radius: 20px; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 2px solid rgba(255,255,255,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="width: 100px; height: 100px; margin: 0 auto 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-coins" style="font-size: 48px; color: white;"></i>
                        </div>
                        <h2 style="color: white; margin: 0 0 10px 0; font-size: 28px;">Payment for Content Access</h2>
                        <p style="color: #94a3b8; margin: 0;">One-time payment for permanent access</p>
                    </div>
                    
                    <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 15px; margin-bottom: 25px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                            <span style="color: #cbd5e1;">Payment Amount:</span>
                            <span style="color: white; font-weight: bold; font-size: 20px;">${this.paymentAmount} PKMON</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                            <span style="color: #cbd5e1;">Your Balance:</span>
                            <span style="color: #10B981; font-weight: bold;">${balance} PKMON</span>
                        </div>
                        <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 15px 0;"></div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #cbd5e1;">Recipient:</span>
                            <span style="color: #60a5fa; font-size: 12px; font-family: monospace;">${this.receiverAddress.slice(0,6)}...${this.receiverAddress.slice(-4)}</span>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 12px;">
                        <button id="exitPaymentBtn" style="flex: 1; padding: 16px; background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s;">
                            <i class="fas fa-times"></i> EXIT
                        </button>
                        <button id="confirmPaymentBtn" style="flex: 2; padding: 16px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; border: none; border-radius: 12px; font-size: 18px; font-weight: bold; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);">
                            <i class="fas fa-check-circle"></i> Confirm Payment
                        </button>
                    </div>
                    
                    <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 20px;">
                        <i class="fas fa-shield-alt"></i> Secure Blockchain Payment
                    </p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('exitPaymentBtn').addEventListener('click', () => {
            modal.remove();
        });

        document.getElementById('confirmPaymentBtn').addEventListener('click', () => {
            modal.remove();
            // ✅ BUG3 FIX: pendingTargetUrl이 있으면 결제 후 해당 URL로 이동
            this.processPayment(userAddress, this.pendingTargetUrl);
            this.pendingTargetUrl = null;
        });
    }

    showInsufficientBalanceModal(balance) {
        const modal = document.createElement('div');
        modal.id = 'pkmonInsufficientModal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; justify-content: center; align-items: center;">
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; border-radius: 20px; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 2px solid rgba(255,255,255,0.1);">
                    <div style="text-align: center;">
                        <div style="width: 100px; height: 100px; margin: 0 auto 20px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: white;"></i>
                        </div>
                        <h2 style="color: white; margin: 0 0 15px 0;">Insufficient PKMON Balance</h2>
                        <p style="color: #94a3b8; margin-bottom: 25px;">
                            Current Balance: <strong style="color: #f59e0b;">${balance} PKMON</strong><br>
                            Required Amount: <strong style="color: white;">${this.paymentAmount} PKMON</strong>
                        </p>
                        
                        <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; margin-bottom: 25px; text-align: left;">
                            <p style="color: #cbd5e1; margin: 0 0 10px 0; font-size: 14px;">
                                <i class="fas fa-shopping-cart" style="color: #10B981; margin-right: 8px;"></i>
                                How to buy PKMON tokens:
                            </p>
                            <ol style="color: #94a3b8; margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
                                <li>Purchase on DEX (Decentralized Exchange)</li>
                                <li>Buy on official memecoin website</li>
                                <li>Get testnet tokens from Faucet</li>
                            </ol>
                        </div>
                        
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer;">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    showProcessingModal(txHash) {
        const modal = document.createElement('div');
        modal.id = 'pkmonProcessingModal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; justify-content: center; align-items: center;">
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; border-radius: 20px; max-width: 450px; width: 90%; text-align: center;">
                    <div class="spinner" style="width: 60px; height: 60px; margin: 0 auto 20px; border: 4px solid rgba(255,255,255,0.1); border-top-color: #10B981; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <h2 style="color: white; margin: 0 0 10px 0;">Processing Payment...</h2>
                    <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">Verifying transaction on blockchain</p>
                    <p style="color: #60a5fa; font-size: 12px; font-family: monospace; word-break: break-all;">
                        ${txHash}
                    </p>
                </div>
            </div>
            <style>
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
        `;

        document.body.appendChild(modal);
    }

    showSuccessModal(txHash, targetUrl = null) {
        document.getElementById('pkmonProcessingModal')?.remove();
        // ✅ BUG3 FIX: 결제 성공 후 이동할 URL 설정
        window.__pkmonSuccessRedirect = () => {
            if (targetUrl) {
                window.location.href = targetUrl;
            } else {
                window.location.reload();
            }
        };
        // 3초 후 자동 이동
        setTimeout(() => {
            if (targetUrl) window.location.href = targetUrl;
            else window.location.reload();
        }, 3000);

        const modal = document.createElement('div');
        modal.id = 'pkmonSuccessModal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; justify-content: center; align-items: center;">
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; border-radius: 20px; max-width: 450px; width: 90%; text-align: center;">
                    <div style="width: 100px; height: 100px; margin: 0 auto 20px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-check" style="font-size: 48px; color: white;"></i>
                    </div>
                    <h2 style="color: white; margin: 0 0 15px 0;">🎉 Payment Complete!</h2>
                    <p style="color: #94a3b8; margin-bottom: 20px;">You now have full access to all content</p>
                    <p style="color: #60a5fa; font-size: 11px; font-family: monospace; word-break: break-all; margin-bottom: 25px;">
                        TX: ${txHash}
                    </p>
                    <button onclick="window.__pkmonSuccessRedirect && window.__pkmonSuccessRedirect()" style="width: 100%; padding: 16px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer;">
                        Get Started
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    showErrorModal(errorMessage) {
        document.getElementById('pkmonProcessingModal')?.remove();

        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; justify-content: center; align-items: center;">
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; border-radius: 20px; max-width: 450px; width: 90%; text-align: center;">
                    <div style="width: 100px; height: 100px; margin: 0 auto 20px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-times" style="font-size: 48px; color: white;"></i>
                    </div>
                    <h2 style="color: white; margin: 0 0 15px 0;">Payment Failed</h2>
                    <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px; word-break: break-word;">
                        ${errorMessage}
                    </p>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer;">
                        Close
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    showAlreadyPaidMessage(userAddress) {
        console.log(`[Payment] 이미 결제된 지갑입니다: ${userAddress}`);
        
        // 간단한 토스트 메시지만 표시 (5초 후 자동 사라짐)
        const toast = document.createElement('div');
        toast.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 16px 24px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 9999; animation: slideIn 0.3s ease-out;">
                <i class="fas fa-check-circle" style="margin-right: 8px;"></i>
                Payment already completed
            </div>
            <style>
                @keyframes slideIn {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            </style>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    showInstallWalletModal() {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; justify-content: center; align-items: center;">
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; border-radius: 20px; max-width: 450px; width: 90%; text-align: center;">
                    <div style="width: 100px; height: 100px; margin: 0 auto 20px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-wallet" style="font-size: 48px; color: white;"></i>
                    </div>
                    <h2 style="color: white; margin: 0 0 15px 0;">Wallet Required</h2>
                    <p style="color: #94a3b8; margin-bottom: 25px;">
                        You need MetaMask or Rabby wallet to access this content
                    </p>
                    <a href="https://metamask.io" target="_blank" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; border-radius: 10px; font-weight: bold; margin-bottom: 10px;">
                        <i class="fab fa-firefox-browser"></i> Install MetaMask
                    </a>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }
}

// ─────────────────────────────────────────
// 페이지 로드 시 자동 실행
// ─────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
    // Ethers.js 로드 확인
    if (typeof window.ethers === 'undefined') {
        console.error('[PKMON] Ethers.js가 로드되지 않았습니다');
        return;
    }

    const paymentSystem = new PKMONOneTimePayment();
    window.pkmonPayment = paymentSystem;

    // ✅ FIX: 페이지 로드 시 자동 checkAccess() 완전 제거
    // → 반드시 사용자가 직접 START / Get Started 버튼을 눌러야만 게이트 작동
    // → accountsChanged 이벤트도 제거 (Rabby 자동 감지 차단)
    console.log('[PKMON] 결제 시스템 대기 중 (수동 트리거 필요)');
});

