// ============================================================
// PKMON One-Time Payment System (Backend API 연동)
// 한 번 결제한 지갑 → 영구 접근 허용
// 잔액 부족 지갑 → 구매 유도 메시지
// 미결제 지갑 → 결제 확인 모달 → 지갑 승인
// ============================================================

class PKMONOneTimePayment {
    constructor() {
        // ✅ PKMON 토큰 컨트랙트 주소 (Monad Testnet)
        this.tokenAddress = '0x39D691612Ef8B4B884b0aA058f41C93d6B527777';

        // ✅ 결제 수신 지갑 주소 - 반드시 실제 주소로 변경하세요!
        this.receiverAddress = '0x39D691612Ef8B4B884b0aA058f41C93d6B527777'; // TODO: 프로젝트 지갑 주소로 변경

        // 결제 금액
        this.paymentAmount = 10000; // 10,000 PKMON

        // 🔧 Backend API URL (배포 시 실제 서버 주소로 변경)
        this.apiUrl = 'http://localhost:3001/api'; // TODO: 프로덕션 서버 주소로 변경

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

        this.userBalance = null;
    }

    // ─────────────────────────────────────────
    // 결제 이력 확인 (백엔드 우선 → 로컬 폴백)
    // ─────────────────────────────────────────
    async checkPaymentHistory(userAddress) {
        const addr = userAddress.toLowerCase();

        try {
            // 백엔드 API 확인 시도
            const response = await fetch(`${this.apiUrl}/check-payment/${addr}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[Payment] 백엔드 확인:', data.hasPaid);
                
                // 백엔드에 있으면 로컬에도 저장 (캐시)
                if (data.hasPaid) {
                    this.savePaymentHistoryLocal(addr);
                }
                
                return data.hasPaid;
            }
        } catch (error) {
            console.warn('[Payment] 백엔드 연결 실패, 로컬 저장소 사용:', error.message);
        }

        // 백엔드 실패 시 로컬스토리지 확인
        return this.checkPaymentHistoryLocal(addr);
    }

    // 로컬스토리지 확인 (폴백)
    checkPaymentHistoryLocal(userAddress) {
        try {
            const paidUsers = JSON.parse(localStorage.getItem('pkmon_paid_users') || '[]');
            return paidUsers.includes(userAddress.toLowerCase());
        } catch (e) {
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
        } catch (e) {
            console.warn('[Payment] localStorage 저장 실패:', e);
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
    // 온체인 잔액 확인
    // ─────────────────────────────────────────
    async checkBalance(userAddress) {
        if (!window.ethereum) throw new Error('지갑이 연결되지 않았습니다.');

        const web3 = new Web3(window.ethereum);
        const contract = new web3.eth.Contract(this.erc20ABI, this.tokenAddress);

        const rawBalance = await contract.methods.balanceOf(userAddress).call();
        const decimals = await contract.methods.decimals().call();
        this.userBalance = parseFloat(rawBalance) / Math.pow(10, parseInt(decimals));

        console.log(`[Payment] 잔액: ${this.userBalance} PKMON`);
        return this.userBalance;
    }

    // ─────────────────────────────────────────
    // 실제 결제 처리 (지갑 트랜잭션)
    // ─────────────────────────────────────────
    async processPayment(userAddress) {
        try {
            if (!window.ethereum) throw new Error('지갑이 연결되지 않았습니다.');

            // 잔액 재확인
            await this.checkBalance(userAddress);
            if (this.userBalance < this.paymentAmount) {
                this.removeProcessingModal();
                this.showInsufficientBalance();
                return false;
            }

            // 결제 확인 모달
            const confirmed = await this.showPaymentConfirmation();
            if (!confirmed) return false;

            // 처리 중 모달 표시
            this.showPaymentProcessing();

            const web3 = new Web3(window.ethereum);
            const contract = new web3.eth.Contract(this.erc20ABI, this.tokenAddress);
            const decimals = await contract.methods.decimals().call();

            // 정확한 금액 계산 (BigInt 방식으로 소수점 오차 방지)
            const amountRaw = web3.utils.toBN(this.paymentAmount)
                .mul(web3.utils.toBN(10).pow(web3.utils.toBN(parseInt(decimals))));

            // 지갑에 트랜잭션 요청 → 사용자가 직접 승인
            const tx = await contract.methods
                .transfer(this.receiverAddress, amountRaw.toString())
                .send({ from: userAddress });

            console.log('[Payment] 트랜잭션 성공:', tx.transactionHash);

            // 결제 이력 저장 (백엔드 + 로컬)
            await this.recordPaymentBackend(userAddress, tx.transactionHash, this.paymentAmount);
            this.savePaymentHistoryLocal(userAddress);

            this.removeProcessingModal();
            this.showPaymentSuccess(tx.transactionHash);
            return true;

        } catch (error) {
            this.removeProcessingModal();
            // 사용자가 거절한 경우
            if (error.code === 4001 || (error.message && error.message.includes('denied'))) {
                this.showPaymentCancelled();
            } else {
                this.showPaymentError(error);
            }
            return false;
        }
    }

    // ─────────────────────────────────────────
    // 메인 접근 제어 함수 (gateAccess)
    // ─────────────────────────────────────────
    async gateAccess(userAddress) {
        try {
            // 1단계: 결제 이력 확인 (백엔드 우선)
            const hasPaid = await this.checkPaymentHistory(userAddress);
            
            if (hasPaid) {
                console.log('[Payment] 기존 결제 사용자 → 즉시 접근 허용');
                this.showAlreadyPaid();
                return true;
            }

            // 2단계: 잔액 확인
            await this.checkBalance(userAddress);

            if (this.userBalance < this.paymentAmount) {
                // 잔액 부족 → 구매 안내
                console.log('[Payment] 잔액 부족:', this.userBalance);
                this.showInsufficientBalance();
                return false;
            }

            // 3단계: 결제 유도 → 지갑 승인
            console.log('[Payment] 결제 가능 → 결제 창 표시');
            const paid = await this.processPayment(userAddress);
            return paid;

        } catch (error) {
            console.error('[Payment] gateAccess 오류:', error);
            this.showNetworkError(error);
            return false;
        }
    }

    // ─────────────────────────────────────────
    // 모달 UI (동일하므로 생략 — 이전 코드와 동일)
    // ─────────────────────────────────────────

    showAlreadyPaid() {
        this.addModalStyles();
        const modal = this.createModal('already-paid', `
            <div class="ppm-icon">✅</div>
            <h2>Welcome Back, Trainer!</h2>
            <p class="ppm-sub">이미 결제된 지갑입니다.</p>
            <div class="ppm-info-box green">
                <span>🎉 대시보드로 이동 중...</span>
            </div>
        `);
        document.body.appendChild(modal);
        setTimeout(() => modal.remove(), 2500);
    }

    showInsufficientBalance() {
        this.addModalStyles();
        const missing = Math.max(0, this.paymentAmount - (this.userBalance || 0));
        const modal = this.createModal('insufficient', `
            <div class="ppm-icon">⚠️</div>
            <h2>PKMON 잔액 부족</h2>
            <p class="ppm-sub">이 서비스를 이용하려면 <strong>${this.paymentAmount.toLocaleString()} PKMON</strong>이 필요합니다.</p>
            <div class="ppm-table">
                <div class="ppm-row">
                    <span>현재 잔액</span>
                    <strong class="red">${(this.userBalance || 0).toLocaleString()} PKMON</strong>
                </div>
                <div class="ppm-row">
                    <span>필요 금액</span>
                    <strong>${this.paymentAmount.toLocaleString()} PKMON</strong>
                </div>
                <div class="ppm-row highlight-red">
                    <span>부족한 금액</span>
                    <strong class="red">${missing.toLocaleString()} PKMON</strong>
                </div>
            </div>
            <p class="ppm-tip">💡 한 번만 결제하면 영구 이용 가능!</p>
            <div class="ppm-buttons">
                <a href="https://nad.fun/tokens/0x39D691612Ef8B4B884b0aA058f41C93d6B527777"
                   target="_blank" class="ppm-btn primary">
                    🛒 PKMON 구매하기
                </a>
                <button class="ppm-btn secondary" onclick="this.closest('.ppm-overlay').remove()">닫기</button>
            </div>
        `);
        document.body.appendChild(modal);
    }

    showPaymentConfirmation() {
        return new Promise((resolve) => {
            this.addModalStyles();
            const balanceAfter = (this.userBalance - this.paymentAmount).toLocaleString();
            const modal = this.createModal('confirm', `
                <div class="ppm-icon">💳</div>
                <h2>10,000 PKMON 결제</h2>
                <p class="ppm-sub">아래 내용을 확인 후 결제를 승인해주세요.</p>
                <div class="ppm-table">
                    <div class="ppm-row">
                        <span>결제 금액</span>
                        <strong>${this.paymentAmount.toLocaleString()} PKMON</strong>
                    </div>
                    <div class="ppm-row">
                        <span>현재 잔액</span>
                        <strong>${(this.userBalance || 0).toLocaleString()} PKMON</strong>
                    </div>
                    <div class="ppm-row">
                        <span>결제 후 잔액</span>
                        <strong>${balanceAfter} PKMON</strong>
                    </div>
                </div>
                <p class="ppm-tip green">✅ 한 번 결제로 영구 이용!</p>
                <p class="ppm-tip red">⚠️ 이 트랜잭션은 되돌릴 수 없습니다.</p>
                <div class="ppm-buttons">
                    <button class="ppm-btn primary" id="ppm-confirm-btn">
                        ✔ ${this.paymentAmount.toLocaleString()} PKMON 결제
                    </button>
                    <button class="ppm-btn secondary" id="ppm-cancel-btn">취소</button>
                </div>
            `);
            document.body.appendChild(modal);

            document.getElementById('ppm-confirm-btn').onclick = () => {
                modal.remove();
                resolve(true);
            };
            document.getElementById('ppm-cancel-btn').onclick = () => {
                modal.remove();
                resolve(false);
            };
        });
    }

    showPaymentProcessing() {
        this.addModalStyles();
        const modal = this.createModal('processing', `
            <div class="ppm-spinner"></div>
            <h2>결제 처리 중...</h2>
            <p class="ppm-sub">지갑에서 트랜잭션을 승인해주세요</p>
            <p class="ppm-tip">⏳ 잠시 기다려주세요...</p>
        `);
        modal.id = 'ppm-processing-modal';
        document.body.appendChild(modal);
    }

    removeProcessingModal() {
        const m = document.getElementById('ppm-processing-modal');
        if (m) m.remove();
    }

    showPaymentSuccess(txHash) {
        this.addModalStyles();
        const shortTx = txHash ? `${txHash.slice(0, 10)}...${txHash.slice(-8)}` : '';
        const modal = this.createModal('success', `
            <div class="ppm-icon">🎉</div>
            <h2>결제 완료!</h2>
            <p class="ppm-sub"><strong>${this.paymentAmount.toLocaleString()} PKMON</strong> 결제가 성공했습니다.</p>
            <div class="ppm-info-box green">
                <span>🔓 영구 접근 권한이 부여되었습니다!</span>
            </div>
            ${shortTx ? `<p class="ppm-tx">TX: ${shortTx}</p>` : ''}
            <p class="ppm-tip">대시보드로 이동 중...</p>
        `);
        document.body.appendChild(modal);
        setTimeout(() => modal.remove(), 3000);
    }

    showPaymentCancelled() {
        this.addModalStyles();
        const modal = this.createModal('cancelled', `
            <div class="ppm-icon">❌</div>
            <h2>결제 취소됨</h2>
            <p class="ppm-sub">지갑에서 트랜잭션을 거절했습니다.</p>
            <p class="ppm-tip">서비스 이용을 원하시면 다시 시도해주세요.</p>
            <div class="ppm-buttons">
                <button class="ppm-btn secondary" onclick="this.closest('.ppm-overlay').remove()">닫기</button>
            </div>
        `);
        document.body.appendChild(modal);
    }

    showPaymentError(error) {
        this.addModalStyles();
        const msg = error?.message || '알 수 없는 오류가 발생했습니다.';
        const modal = this.createModal('error', `
            <div class="ppm-icon">🚨</div>
            <h2>결제 실패</h2>
            <p class="ppm-sub">트랜잭션이 실패했습니다.</p>
            <div class="ppm-info-box red">
                <span>${msg}</span>
            </div>
            <p class="ppm-tip">Monad Testnet에 연결되어 있는지 확인해주세요.</p>
            <div class="ppm-buttons">
                <button class="ppm-btn secondary" onclick="this.closest('.ppm-overlay').remove()">닫기</button>
            </div>
        `);
        document.body.appendChild(modal);
    }

    showNetworkError(error) {
        this.addModalStyles();
        const modal = this.createModal('network-error', `
            <div class="ppm-icon">🌐</div>
            <h2>네트워크 오류</h2>
            <p class="ppm-sub">Monad Testnet에 연결되어 있는지 확인해주세요.</p>
            <div class="ppm-info-box red">
                <span>${error?.message || '네트워크 연결 오류'}</span>
            </div>
            <div class="ppm-buttons">
                <button class="ppm-btn secondary" onclick="this.closest('.ppm-overlay').remove()">닫기</button>
            </div>
        `);
        document.body.appendChild(modal);
    }

    createModal(type, innerHtml) {
        const overlay = document.createElement('div');
        overlay.className = `ppm-overlay ppm-${type}`;
        overlay.innerHTML = `<div class="ppm-card">${innerHtml}</div>`;
        return overlay;
    }

    addModalStyles() {
        if (document.getElementById('ppm-styles')) return;
        const style = document.createElement('style');
        style.id = 'ppm-styles';
        style.textContent = `
            .ppm-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.88);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                animation: ppmFadeIn 0.25s ease;
                backdrop-filter: blur(4px);
            }
            .ppm-card {
                background: linear-gradient(145deg, #0f0f1a 0%, #1a1a2e 100%);
                border: 1.5px solid rgba(124,58,237,0.5);
                border-radius: 24px;
                padding: 2.5rem 2rem;
                max-width: 460px;
                width: 92%;
                text-align: center;
                box-shadow: 0 30px 80px rgba(124,58,237,0.35);
                animation: ppmSlideUp 0.3s ease;
                color: #e5e7eb;
            }
            .ppm-icon {
                font-size: 3.2rem;
                margin-bottom: 0.8rem;
                line-height: 1;
            }
            .ppm-card h2 {
                color: #fff;
                font-size: 1.7rem;
                font-weight: 800;
                margin: 0 0 0.6rem;
            }
            .ppm-sub {
                color: #9ca3af;
                font-size: 1rem;
                margin: 0.4rem 0 1.2rem;
                line-height: 1.6;
            }
            .ppm-sub strong { color: #fff; }
            .ppm-table {
                background: rgba(124,58,237,0.1);
                border: 1px solid rgba(124,58,237,0.25);
                border-radius: 14px;
                padding: 0.8rem 1rem;
                margin: 1rem 0;
                text-align: left;
            }
            .ppm-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.55rem 0;
                border-bottom: 1px solid rgba(255,255,255,0.06);
                font-size: 0.95rem;
            }
            .ppm-row:last-child { border-bottom: none; }
            .ppm-row.highlight-red {
                background: rgba(239,68,68,0.12);
                padding: 0.6rem 0.6rem;
                border-radius: 8px;
                margin-top: 0.3rem;
            }
            .ppm-row strong { font-weight: 700; color: #fff; }
            .ppm-row strong.red { color: #f87171; }
            .ppm-info-box {
                border-radius: 12px;
                padding: 0.9rem 1rem;
                margin: 1rem 0;
                font-weight: 600;
                font-size: 0.95rem;
            }
            .ppm-info-box.green {
                background: rgba(16,185,129,0.15);
                border: 1px solid rgba(16,185,129,0.3);
                color: #6ee7b7;
            }
            .ppm-info-box.red {
                background: rgba(239,68,68,0.15);
                border: 1px solid rgba(239,68,68,0.3);
                color: #fca5a5;
            }
            .ppm-tip {
                font-size: 0.88rem;
                margin: 0.5rem 0;
                color: #9ca3af;
            }
            .ppm-tip.green { color: #6ee7b7; font-weight: 600; }
            .ppm-tip.red { color: #fca5a5; font-weight: 600; }
            .ppm-tx {
                font-size: 0.8rem;
                color: #6b7280;
                font-family: monospace;
                margin: 0.5rem 0;
            }
            .ppm-buttons {
                display: flex;
                gap: 0.75rem;
                margin-top: 1.5rem;
            }
            .ppm-btn {
                flex: 1;
                padding: 0.85rem 1rem;
                border-radius: 12px;
                border: none;
                cursor: pointer;
                font-size: 0.95rem;
                font-weight: 700;
                transition: all 0.25s;
                text-decoration: none;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .ppm-btn.primary {
                background: linear-gradient(135deg, #7c3aed, #4f46e5);
                color: #fff;
                box-shadow: 0 4px 20px rgba(124,58,237,0.4);
            }
            .ppm-btn.primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 28px rgba(124,58,237,0.55);
            }
            .ppm-btn.secondary {
                background: rgba(255,255,255,0.08);
                color: #d1d5db;
                border: 1px solid rgba(255,255,255,0.15);
            }
            .ppm-btn.secondary:hover {
                background: rgba(255,255,255,0.14);
                transform: translateY(-1px);
            }
            .ppm-spinner {
                width: 56px;
                height: 56px;
                border: 4px solid rgba(124,58,237,0.2);
                border-top-color: #7c3aed;
                border-radius: 50%;
                animation: ppmSpin 0.9s linear infinite;
                margin: 0 auto 1rem;
            }
            @keyframes ppmFadeIn { from { opacity:0 } to { opacity:1 } }
            @keyframes ppmSlideUp {
                from { transform: translateY(30px); opacity:0 }
                to   { transform: translateY(0);    opacity:1 }
            }
            @keyframes ppmSpin { to { transform: rotate(360deg) } }
        `;
        document.head.appendChild(style);
    }
}

// ─────────────────────────────────────────
// DOM 로드 후 초기화
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    window.pkmonPayment = new PKMONOneTimePayment();
    console.log('[PKMON] 결제 시스템 초기화 완료 (백엔드 연동)');
});
