// Battle Engine & Betting System using PokeAPI
import { TRAINERS } from './trainers.js';
import CONFIG from './config.js';

class BattleEngine {
    constructor() {
        this.gameState = 'WAITING'; // WAITING, BETTING, BATTLING, ENDED
        this.timer = 0;
        this.teamA = [];
        this.teamB = [];
        this.bets = { A: 0, B: 0 };
        this.userBets = []; // { team, amount, token }

        this.battleLog = [];
        this.turn = 0;

        // DOM Elements
        this.elements = {
            timer: document.getElementById('battleCountdown'),
            status: document.getElementById('battleStatus'),
            teamA: document.getElementById('teamA'),
            teamB: document.getElementById('teamB'),
            log: document.getElementById('battleLogText'),
            pool: document.getElementById('poolTotal'),
            chat: document.getElementById('moltbookFeed')
        };

        this.init();
    }

    init() {
        console.log("🎮 Battle Engine Initialized");

        // Calculate time until next battle (UTC :00 or :30)
        this.syncToUTC();

        // Start the global timer loop
        setInterval(() => this.tick(), 1000);

        // Start Chat Simulation (increased frequency)
        setInterval(() => this.processChat(), 3000);

        // Start Betting Simulation
        setInterval(() => this.simulateBetting(), 2500);

        // Initial setup
        this.startNewCycle();
    }

    syncToUTC() {
        // Fixed 2-minute battle cycles
        this.timer = 2 * 60; // 2 minutes
        console.log(`⏰ Next battle in 2 minutes`);
    }

    async startNewCycle() {
        this.gameState = 'BETTING';

        // Reset state
        this.bets = { A: 0, B: 0 };
        this.userBets = [];
        this.turn = 0;
        this.updatePoolDisplay();
        this.log("🔥 New Battle Cycle Started! Place your bets!");
        this.updateStatus("BETS OPEN - MATCHMAKING");

        // Fetch Pokemon IMMEDIATELY so users can see them
        await this.fetchTeams();

        // Announce the matchup
        this.log(`⚔️ MATCHUP: ${this.teamA[0].name} vs ${this.teamB[0].name}`);
        this.triggerChat('matchup', {});
        this.triggerChat('idle', {});
    }

    simulateBetting() {
        if (this.gameState !== 'BETTING') return;

        // 50% chance to skip a tick for randomness
        if (Math.random() > 0.6) return;

        const fakeUsers = [
            "AshLover99", "TeamRocket_Grunt", "MistyWater", "Brock_Solid", "GaryOak_Official",
            "PokeFan_KR", "Satoshi_JP", "Red_Champion", "Blue_Rival", "Prof_Oak",
            "Nurse_Joy_Fan", "Officer_Jenny", "Eevee_Cute", "Pika_Pika", "Mewtwo_Strikes",
            "Gengar_Ghost", "Dragonite_Fly", "Snorlax_Sleep", "Jiggly_Sing", "Psyduck_Confused",
            "Crypto_Whale", "Doge_Coin", "Shiba_Inu", "Pepe_Frog", "Wojak_Trader"
        ];

        const randomUser = fakeUsers[Math.floor(Math.random() * fakeUsers.length)];
        const teams = ['A', 'B'];
        const randomTeam = teams[Math.floor(Math.random() * teams.length)];

        // Random bet amount (weighted towards smaller bets)
        let amount;
        const rand = Math.random();
        if (rand > 0.95) amount = Math.floor(Math.random() * 5000) + 1000; // Whale bet
        else if (rand > 0.8) amount = Math.floor(Math.random() * 1000) + 500; // Big bet
        else amount = Math.floor(Math.random() * 400) + 10; // Small bet

        // Round to 10
        amount = Math.ceil(amount / 10) * 10;

        // Update internal state
        this.bets[randomTeam] += amount;
        this.updatePoolDisplay();

        // 30% chance to show in log to avoid spam
        if (Math.random() > 0.7) {
            const teamColor = randomTeam === 'A' ? 'var(--accent-blue)' : '#EF4444';
            const logEntry = document.createElement('div');
            logEntry.innerHTML = `<span style="color: #bbb">${randomUser}</span> bet <span style="color: var(--accent-yellow)">${amount} PKMON</span> on <span style="color: ${teamColor}">Team ${randomTeam}</span>`;
            logEntry.style.fontSize = '0.8rem';
            logEntry.style.padding = '2px 0';
            logEntry.style.opacity = '0.8';

            this.elements.log.appendChild(logEntry);
            this.elements.log.scrollTop = this.elements.log.scrollHeight;
        }

        // Flash the pool display
        this.elements.pool.style.color = '#fff';
        setTimeout(() => this.elements.pool.style.color = 'var(--accent-yellow)', 200);
    }

    async fetchTeams() {
        try {
            // Random IDs between 1 and 1025
            const ids = Array.from({ length: 4 }, () => Math.floor(Math.random() * 1025) + 1);

            // Fetch data from PokeAPI (including moves)
            const promises = ids.map(id =>
                fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
                    .then(r => r.json())
            );
            const results = await Promise.all(promises);

            // Format Pokemon Data with moves
            const combatants = results.map(p => ({
                name: p.name.toUpperCase(),
                sprite: p.sprites.front_default || p.sprites.other['official-artwork'].front_default,
                hp: p.stats[0].base_stat * 3, // Boost HP for longer battles
                maxHp: p.stats[0].base_stat * 3,
                attack: p.stats[1].base_stat,
                defense: p.stats[2].base_stat,
                speed: p.stats[5].base_stat,
                types: p.types.map(t => t.type.name),
                moves: p.moves.slice(0, 8).map(m => ({
                    name: m.move.name.replace(/-/g, ' ').toUpperCase(),
                    url: m.move.url
                })),
                alive: true
            }));

            this.teamA = [combatants[0], combatants[1]];
            this.teamB = [combatants[2], combatants[3]];

            // IMMEDIATELY render them
            this.renderTeams();

            console.log("✅ Pokemon loaded:", this.teamA[0].name, "vs", this.teamB[0].name);
            console.log("   Moves:", this.teamA[0].moves.map(m => m.name).join(', '));
        } catch (error) {
            console.error("❌ Failed to fetch Pokemon:", error);
            this.log("⚠️ Failed to load Pokemon. Retrying...");
            setTimeout(() => this.fetchTeams(), 2000);
        }
    }

    renderTeams() {
        // Render Team A
        if (this.teamA.length > 0) {
            this.updateUnitDOM('teamA', this.teamA[0]);
        }

        // Render Team B
        if (this.teamB.length > 0) {
            this.updateUnitDOM('teamB', this.teamB[0]);
        }
    }

    updateUnitDOM(teamId, pokemon) {
        const el = document.getElementById(teamId);
        if (!el || !pokemon) {
            console.warn(`Cannot update ${teamId}:`, pokemon);
            return;
        }

        // Update name
        const nameEl = el.querySelector('.name');
        if (nameEl) {
            nameEl.textContent = pokemon.name;
            nameEl.style.opacity = '1';
        }

        // Update sprite
        const sprite = el.querySelector('.pokemon-sprite');
        if (sprite) {
            sprite.src = pokemon.sprite;
            sprite.style.opacity = '1';
        }

        // Reset Health Bar
        const hpBar = el.querySelector('.hp-bar');
        if (hpBar) {
            hpBar.style.width = '100%';
            hpBar.className = 'hp-bar';
        }
    }

    tick() {
        // Timer Logic
        this.timer--;
        if (this.timer < 0) {
            // Resync to UTC
            this.syncToUTC();
            return;
        }

        const mins = Math.floor(this.timer / 60);
        const secs = this.timer % 60;
        this.elements.timer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        // Phase Transitions - use <= to be safe
        if (this.gameState === 'BETTING' && this.timer <= 0) {
            this.startBattle();
        }
    }

    startBattle() {
        this.gameState = 'BATTLING';
        this.updateStatus("⚔️ BATTLE IN PROGRESS");
        this.log("⚠️ BETTING CLOSED - BATTLE COMMENCING ⚠️");
        this.log(`🔥 ${this.teamA[0].name} (HP: ${this.teamA[0].hp}) vs ${this.teamB[0].name} (HP: ${this.teamB[0].hp})`);

        // Start Combat Loop
        this.combatInterval = setInterval(() => this.combatStep(), 2500);
    }

    combatStep() {
        // Simple 1v1 logic for MVP (Team Leader vs Team Leader)
        const p1 = this.teamA[0];
        const p2 = this.teamB[0];

        if (!p1.alive || !p2.alive) {
            this.endBattle(p1.alive ? 'A' : 'B');
            return;
        }

        // Determine Turn (Speed-based)
        const attacker = p1.speed >= p2.speed ? p1 : p2;
        const defender = attacker === p1 ? p2 : p1;

        // Random Move (from loaded moves)
        const move = attacker.moves.length > 0 
            ? attacker.moves[Math.floor(Math.random() * attacker.moves.length)].name
            : 'TACKLE';

        // Calculate Damage
        const baseDmg = Math.max(1, attacker.attack - defender.defense * 0.5);
        const dmg = Math.floor(baseDmg * (0.85 + Math.random() * 0.3));

        // Apply Damage
        defender.hp = Math.max(0, defender.hp - dmg);

        // Critical Hit / Super Effective
        const crit = Math.random() < 0.15;
        const superEffective = Math.random() < 0.25;

        if (crit) this.triggerChat('crit_hit', {});
        if (superEffective) this.triggerChat('super_effective', {});
        if (defender.hp / defender.maxHp < 0.3) this.triggerChat('low_hp', {});

        this.triggerChat('move_used', { move });

        // Log Combat
        this.log(`💥 ${attacker.name} used ${move} → ${dmg} DMG!${crit ? ' [CRITICAL!]' : ''}${superEffective ? ' [SUPER EFFECTIVE!]' : ''}`);

        // Update Health Bars
        this.updateHealthBar('teamA', this.teamA[0]);
        this.updateHealthBar('teamB', this.teamB[0]);

        this.turn++;
    }

    updateHealthBar(teamId, pokemon) {
        const hpPercent = (pokemon.hp / pokemon.maxHp) * 100;
        const el = document.getElementById(teamId);
        if (!el) return;

        const hpBar = el.querySelector('.hp-bar');
        if (!hpBar) return;

        hpBar.style.width = `${hpPercent}%`;

        // Color Logic
        if (hpPercent > 50) hpBar.className = 'hp-bar hp-high';
        else if (hpPercent > 20) hpBar.className = 'hp-bar hp-medium';
        else hpBar.className = 'hp-bar hp-low';
    }

    endBattle(winner) {
        clearInterval(this.combatInterval);
        this.gameState = 'ENDED';
        this.updateStatus(`🏆 TEAM ${winner} WINS!`);
        this.log(`🎉 TEAM ${winner} WINS THE BATTLE!`);
        this.triggerChat('win', {});

        // Payout logic
        const totalPool = this.bets.A + this.bets.B;
        const winningBets = this.userBets.filter(b => b.team === winner);
        const losingBets = this.userBets.filter(b => b.team !== winner);

        if (winningBets.length > 0) {
            winningBets.forEach(bet => {
                this.log(`✅ You won ${bet.amount * 2} ${bet.token}!`);
            });
            this.showWinModal(winningBets[0].amount, totalPool);
        } else if (losingBets.length > 0) {
            this.log(`❌ You lost ${losingBets[0].amount} ${losingBets[0].token}`);
            this.showLoseModal(losingBets[0].amount, totalPool);
        }

        // Restart after 15s
        setTimeout(() => {
            this.syncToUTC();
            this.startNewCycle();
        }, 15000);
    }

    updateStatus(text) {
        if (this.elements.status) {
            this.elements.status.textContent = text;
        }
    }

    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.textContent = `[${timestamp}] ${message}`;
        entry.style.marginBottom = '8px';
        entry.style.fontSize = '0.95rem';
        this.elements.log.appendChild(entry);
        this.elements.log.scrollTop = this.elements.log.scrollHeight;

        // Limit log size
        const logs = this.elements.log.querySelectorAll('div');
        if (logs.length > 100) {
            logs[0].remove();
        }
    }

    updatePoolDisplay() {
        const total = this.bets.A + this.bets.B;
        if (this.elements.pool) {
            this.elements.pool.textContent = `${total.toFixed(2)} PKMON`;
        }
    }

    // Betting
    async placeBet(team, amount, token) {
        const MAX_BET = 10;
        if (this.gameState !== 'BETTING') {
            alert("Betting is closed! Battle is in progress.");
            return;
        }

        const parsedAmount = parseFloat(amount);
        if (parsedAmount > MAX_BET) return;

        // 온체인 PKMON 전송
        const BET_RECEIVER = '0x2e06710f034190A1d6419Ed56A41b2Da82B3a922';
        const TOKEN_ADDRESS = '0x39D691612Ef8B4B884b0aA058f41C93d6B527777';
        const ERC20_ABI = [
            { "constant": false, "inputs": [{ "name": "_to", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "transfer", "outputs": [{ "name": "", "type": "bool" }], "type": "function" }
        ];

        try {
            if (window.walletConnector) await window.walletConnector.switchToMonad();

            const provider = new window.ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new window.ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, signer);
            const amountWei = window.ethers.utils.parseUnits(parsedAmount.toString(), 18); // PKMON uses 18 decimals

            const tx = await contract.transfer(BET_RECEIVER, amountWei);
            this.log(`⏳ Sending ${parsedAmount} PKMON... TX: ${tx.hash.slice(0,10)}...`);

            await tx.wait();
            this.log(`✅ Bet confirmed! ${parsedAmount} PKMON on Team ${team}`);

            this.bets[team] += parsedAmount;
            this.userBets.push({ team, amount: parsedAmount, token, txHash: tx.hash });
            this.updatePoolDisplay();
            this.triggerChat('bet_placed', { team, amount: parsedAmount });
        }
        catch (error) {
            console.error('[Bet] Failed to send:', error);
            this.log(`❌ Bet failed: ${error.message}`);
        }
    }

    // Chat System (more active)
    processChat() {
        // More frequent idle chatter during betting (50% chance every 3 seconds)
        if (this.gameState === 'BETTING' && Math.random() > 0.5) {
            this.triggerChat('idle', {});
        }
        // Commentary during battle (30% chance)
        if (this.gameState === 'BATTLING' && Math.random() > 0.7) {
            this.triggerChat('idle', {});
        }
    }

    triggerChat(event, context) {
        const trainer = TRAINERS[Math.floor(Math.random() * TRAINERS.length)];
        const msg = trainer.react(event, context);

        if (msg) {
            this.addChatMessage(trainer, msg);
        }
    }

    addChatMessage(trainer, text) {
        const div = document.createElement('div');
        div.className = 'chat-entry';
        div.innerHTML = `
            <img src="${trainer.avatar}" class="trainer-avatar" style="border-color: ${trainer.color}">
            <div class="chat-bubble">
                <div class="trainer-name" style="color: ${trainer.color}">${trainer.name}</div>
                ${text}
            </div>
        `;

        this.elements.chat.appendChild(div);
        this.elements.chat.scrollTop = this.elements.chat.scrollHeight;

        // Limit chat history to prevent memory issues
        const entries = this.elements.chat.querySelectorAll('.chat-entry');
        if (entries.length > 50) {
            entries[0].remove();
        }
    }

    showWinModal(betAmount, totalPool) {
        const payout = betAmount * 2; // 2배 리워드
        
        const modal = document.createElement('div');
        modal.id = 'betResultModal';
        modal.innerHTML = `
            <div style="position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;justify-content:center;align-items:center;">
                <div style="background:linear-gradient(135deg,#0f1729,#1a2744);border-radius:20px;padding:2.5rem 2rem;width:340px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.6);border:1px solid rgba(16,185,129,0.3);">
                    <div style="width:80px;height:80px;background:linear-gradient(135deg,#10B981,#059669);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;font-size:2.5rem;">🎉</div>
                    <div style="font-size:1.4rem;font-weight:800;color:#fff;margin-bottom:0.75rem;">Congratulations!</div>
                    <div style="font-size:1rem;color:#94a3b8;margin-bottom:0.5rem;">You won the bet!</div>
                    <div style="font-size:1.1rem;color:#10B981;font-weight:700;margin-bottom:1.75rem;">+${payout.toFixed(2)} PKMON</div>
                    <button id="claimRewardBtn" style="width:100%;padding:0.85rem;background:linear-gradient(135deg,#10B981,#059669);color:white;border:none;border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;transition:all 0.2s;">
                        🏆 Claim Reward
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // 버튼 호버 효과
        const btn = modal.querySelector('#claimRewardBtn');
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.02)';
            btn.style.boxShadow = '0 4px 12px rgba(16,185,129,0.4)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = 'none';
        });

        // 클릭 이벤트 - Claim Reward
        btn.addEventListener('click', async () => {
            modal.remove();
            await this.claimReward(betAmount);
        });
    }

showLoseModal(betAmount, totalPool) {
        const modal = document.createElement('div');
        modal.id = 'betResultModal';
        modal.innerHTML = `
            <div style="position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;justify-content:center;align-items:center;">
                <div style="background:linear-gradient(135deg,#0f1729,#1a2744);border-radius:20px;padding:2.5rem 2rem;width:340px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.6);border:1px solid rgba(239,68,68,0.3);">
                    <div style="width:80px;height:80px;background:linear-gradient(135deg,#ef4444,#dc2626);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;font-size:2.5rem;">😢</div>
                    <div style="font-size:1.4rem;font-weight:800;color:#fff;margin-bottom:0.75rem;">Better luck next time!</div>
                    <div style="font-size:1rem;color:#94a3b8;margin-bottom:1rem;">Try again!</div>
                    <div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:0.75rem;margin-bottom:1.75rem;">
                        <div style="font-size:0.85rem;color:#64748b;margin-bottom:0.25rem;">Total Pool</div>
                        <div style="font-size:1.1rem;color:#fbbf24;font-weight:700;">${totalPool.toFixed(2)} PKMON</div>
                    </div>
                    <button id="loseModalCloseBtn" style="width:100%;padding:0.85rem;background:rgba(255,255,255,0.1);color:white;border:none;border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;transition:all 0.2s;">
                        Close
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // 버튼 호버 효과
        const btn = modal.querySelector('#loseModalCloseBtn');
        btn.addEventListener('mouseenter', () => {
            btn.style.background = 'rgba(255,255,255,0.15)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.background = 'rgba(255,255,255,0.1)';
        });

        // 클릭 이벤트
        btn.addEventListener('click', () => {
            modal.remove();
        });
    }


    async claimReward(betAmount) {
        const payout = betAmount * 2;

        // 클레임 로딩 오버레이
        const loadingEl = document.createElement('div');
        loadingEl.id = 'claimLoadingOverlay';
        loadingEl.innerHTML = `
            <div style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;justify-content:center;align-items:center;">
                <div style="text-align:center;">
                    <div style="width:56px;height:56px;border:4px solid rgba(16,185,129,0.2);border-top:4px solid #10B981;border-radius:50%;margin:0 auto 16px;animation:claimSpin 1s linear infinite;"></div>
                    <div style="color:#fff;font-size:1rem;font-weight:600;">Claiming reward...</div>
                    <div style="color:#94a3b8;font-size:0.85rem;margin-top:6px;">Sending ${payout} PKMON to your wallet</div>
                </div>
            </div>
            <style>@keyframes claimSpin{to{transform:rotate(360deg)}}</style>
        `;
        document.body.appendChild(loadingEl);

        try {
            // 유저 주소 확인
            if (!window.ethereum) throw new Error('Wallet not connected');
            const provider = new window.ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const userAddress = await signer.getAddress();

            // 백엔드 payout API 호출 (서버에서 개인키로 서명 후 전송)
            const response = await fetch('https://pkmon-payment-backend-api.onrender.com/api/payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: userAddress,
                    amount: payout,
                    timestamp: Date.now()
                })
            });

            const data = await response.json();
            document.getElementById('claimLoadingOverlay')?.remove();

            if (response.ok && data.success) {
                this.log(`🎉 Reward claimed! ${payout} PKMON sent. TX: ${data.txHash?.slice(0,10)}...`);

                const successModal = document.createElement('div');
                successModal.innerHTML = `
                    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;justify-content:center;align-items:center;">
                        <div style="background:linear-gradient(135deg,#0f1729,#1a2744);border-radius:20px;padding:2.5rem 2rem;width:340px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.6);border:1px solid rgba(16,185,129,0.3);">
                            <div style="width:80px;height:80px;background:linear-gradient(135deg,#10B981,#059669);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;font-size:2.5rem;">✅</div>
                            <div style="font-size:1.3rem;font-weight:800;color:#fff;margin-bottom:0.5rem;">Reward Sent!</div>
                            <div style="color:#10B981;font-weight:700;font-size:1.1rem;margin-bottom:0.5rem;">+${payout} PKMON</div>
                            <div style="color:#64748b;font-size:0.75rem;font-family:monospace;margin-bottom:1.5rem;word-break:break-all;">TX: ${data.txHash}</div>
                            <button onclick="this.closest('div').parentElement.remove()" style="width:100%;padding:0.85rem;background:linear-gradient(135deg,#10B981,#059669);color:white;border:none;border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;">OK</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(successModal);
            } else {
                throw new Error(data.error || 'Payout failed. Please try again.');
            }
        } catch (error) {
            document.getElementById('claimLoadingOverlay')?.remove();
            console.error('[Claim] Failed:', error);
            this.log(`❌ Claim failed: ${error.message}`);

            const errModal = document.createElement('div');
            errModal.innerHTML = `
                <div style="position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;justify-content:center;align-items:center;">
                    <div style="background:linear-gradient(135deg,#0f1729,#1a2744);border-radius:20px;padding:2.5rem 2rem;width:340px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.6);border:1px solid rgba(239,68,68,0.3);">
                        <div style="width:80px;height:80px;background:linear-gradient(135deg,#ef4444,#dc2626);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;font-size:2.5rem;">❌</div>
                        <div style="font-size:1.2rem;font-weight:800;color:#fff;margin-bottom:0.5rem;">Claim Failed</div>
                        <div style="color:#94a3b8;font-size:0.85rem;margin-bottom:1.5rem;">${error.message}</div>
                        <button onclick="this.closest('div').parentElement.remove()" style="width:100%;padding:0.85rem;background:rgba(255,255,255,0.1);color:white;border:none;border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;">Close</button>
                    </div>
                </div>
            `;
            document.body.appendChild(errModal);
        }
    }
}

// Global accessor
window.addEventListener('DOMContentLoaded', () => {
    window.battleEngine = new BattleEngine();
});
