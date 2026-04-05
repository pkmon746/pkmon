// ethers.js guard helper
function _getEthers() {
    if (typeof window.ethers !== 'undefined') return window.ethers;
    if (typeof ethers !== 'undefined') return ethers;
    throw new Error('ethers.js is not loaded. Include ethers.min.js before battle.js');
}

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
        this.battle_id = null;

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

        // Start Chat Simulation
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
        this.battle_id = `battle_${Date.now()}`;

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

        // 40% chance to skip a tick for randomness
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
            logEntry.innerHTML = `<span style="color: #bbb">${randomUser}</span> bet <span style="color: var(--accent-yellow)">${amount} RLO</span> on <span style="color: ${teamColor}">Team ${randomTeam}</span>`;
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
        if (this.teamA.length > 0) {
            this.updateUnitDOM('teamA', this.teamA[0]);
        }
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

        const nameEl = el.querySelector('.name');
        if (nameEl) {
            nameEl.textContent = pokemon.name;
            nameEl.style.opacity = '1';
        }

        const sprite = el.querySelector('.pokemon-sprite');
        if (sprite) {
            sprite.src = pokemon.sprite;
            sprite.style.opacity = '1';
        }

        const hpBar = el.querySelector('.hp-bar');
        if (hpBar) {
            hpBar.style.width = '100%';
            hpBar.className = 'hp-bar';
        }
    }

    tick() {
        this.timer--;
        if (this.timer < 0) {
            this.syncToUTC();
            return;
        }

        const mins = Math.floor(this.timer / 60);
        const secs = this.timer % 60;
        this.elements.timer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        // Phase Transitions
        if (this.gameState === 'BETTING' && this.timer <= 0) {
            this.startBattle();
        }
    }

    startBattle() {
        this.gameState = 'BATTLING';
        this.updateStatus("⚔️ BATTLE IN PROGRESS");
        this.log("⚠️ BETTING CLOSED - BATTLE COMMENCING ⚠️");
        this.log(`🔥 ${this.teamA[0].name} (HP: ${this.teamA[0].hp}) vs ${this.teamB[0].name} (HP: ${this.teamB[0].hp})`);

        this.combatInterval = setInterval(() => this.combatStep(), 2500);
    }

    combatStep() {
        const p1 = this.teamA[0];
        const p2 = this.teamB[0];

        if (!p1.alive || !p2.alive) {
            this.endBattle(p1.alive ? 'A' : 'B');
            return;
        }

        // Determine Turn (Speed-based)
        this.turn++;
        const attacker = p1.speed >= p2.speed ? (this.turn % 2 !== 0 ? p1 : p2) : (this.turn % 2 !== 0 ? p2 : p1);
        const defender = attacker === p1 ? p2 : p1;
        const defenderTeam = attacker === p1 ? 'teamB' : 'teamA';

        // Select a random move
        const move = attacker.moves && attacker.moves.length > 0
            ? attacker.moves[Math.floor(Math.random() * attacker.moves.length)]
            : { name: 'TACKLE' };

        // Damage Calc with type effectiveness
        const crit = Math.random() < 0.1;
        const typeBonus = this.checkTypeEffectiveness(attacker.types, defender.types);
        let damage = Math.floor((attacker.attack / defender.defense) * 20 * typeBonus) + 5;
        if (crit) damage *= 2;

        defender.hp -= damage;
        if (defender.hp <= 0) {
            defender.hp = 0;
            defender.alive = false;
        }

        let logMsg = `⚡ ${attacker.name} used ${move.name}!`;
        this.log(logMsg);

        if (crit) this.log('   💥 CRITICAL HIT!');
        if (typeBonus > 1) this.log('   ✨ Super effective!');
        if (typeBonus < 1) this.log('   🛡️ Not very effective...');
        this.log(`   └─ ${defender.name} took ${damage} damage! (HP: ${defender.hp}/${defender.maxHp})`);

        this.updateHpBar(defenderTeam, defender);
        this.showAttackEffect(defenderTeam, crit);

        if (crit) this.triggerChat('crit_hit', { damage: damage });
        if (typeBonus > 1) this.triggerChat('super_effective', {});
        if (move.name) this.triggerChat('move_used', { move: move.name });

        const hpPercent = (defender.hp / defender.maxHp) * 100;
        if (hpPercent < 30 && hpPercent > 0) {
            this.triggerChat('low_hp', {});
        }
    }

    showAttackEffect(targetTeamId, isCrit) {
        const el = document.getElementById(targetTeamId);
        if (!el) return;

        el.style.transition = 'filter 0.2s';
        el.style.filter = isCrit ? 'brightness(2) saturate(2)' : 'brightness(1.5)';

        setTimeout(() => {
            el.style.filter = 'brightness(1)';
        }, 200);

        const sprite = el.querySelector('.pokemon-sprite');
        if (sprite) {
            sprite.style.animation = 'shake 0.3s';
            setTimeout(() => {
                sprite.style.animation = '';
            }, 300);
        }
    }

    checkTypeEffectiveness(attackerTypes, defenderTypes) {
        const chart = {
            'fire': { 'grass': 2, 'ice': 2, 'bug': 2, 'steel': 2, 'water': 0.5, 'fire': 0.5, 'rock': 0.5, 'dragon': 0.5 },
            'water': { 'fire': 2, 'ground': 2, 'rock': 2, 'grass': 0.5, 'water': 0.5, 'dragon': 0.5 },
            'grass': { 'water': 2, 'ground': 2, 'rock': 2, 'fire': 0.5, 'grass': 0.5, 'poison': 0.5, 'flying': 0.5, 'bug': 0.5, 'dragon': 0.5, 'steel': 0.5 },
            'electric': { 'water': 2, 'flying': 2, 'grass': 0.5, 'electric': 0.5, 'dragon': 0.5, 'ground': 0 },
            'ice': { 'grass': 2, 'ground': 2, 'flying': 2, 'dragon': 2, 'fire': 0.5, 'water': 0.5, 'ice': 0.5, 'steel': 0.5 },
            'fighting': { 'normal': 2, 'ice': 2, 'rock': 2, 'dark': 2, 'steel': 2, 'poison': 0.5, 'flying': 0.5, 'psychic': 0.5, 'bug': 0.5, 'fairy': 0.5, 'ghost': 0 },
            'poison': { 'grass': 2, 'fairy': 2, 'poison': 0.5, 'ground': 0.5, 'rock': 0.5, 'ghost': 0.5, 'steel': 0 },
            'ground': { 'fire': 2, 'electric': 2, 'poison': 2, 'rock': 2, 'steel': 2, 'grass': 0.5, 'bug': 0.5, 'flying': 0 },
            'flying': { 'grass': 2, 'fighting': 2, 'bug': 2, 'electric': 0.5, 'rock': 0.5, 'steel': 0.5 },
            'psychic': { 'fighting': 2, 'poison': 2, 'psychic': 0.5, 'steel': 0.5, 'dark': 0 },
            'bug': { 'grass': 2, 'psychic': 2, 'dark': 2, 'fire': 0.5, 'fighting': 0.5, 'poison': 0.5, 'flying': 0.5, 'ghost': 0.5, 'steel': 0.5, 'fairy': 0.5 },
            'rock': { 'fire': 2, 'ice': 2, 'flying': 2, 'bug': 2, 'fighting': 0.5, 'ground': 0.5, 'steel': 0.5 },
            'ghost': { 'psychic': 2, 'ghost': 2, 'dark': 0.5, 'normal': 0 },
            'dragon': { 'dragon': 2, 'steel': 0.5, 'fairy': 0 },
            'dark': { 'psychic': 2, 'ghost': 2, 'fighting': 0.5, 'dark': 0.5, 'fairy': 0.5 },
            'steel': { 'ice': 2, 'rock': 2, 'fairy': 2, 'fire': 0.5, 'water': 0.5, 'electric': 0.5, 'steel': 0.5 },
            'fairy': { 'fighting': 2, 'dragon': 2, 'dark': 2, 'fire': 0.5, 'poison': 0.5, 'steel': 0.5 }
        };

        let multiplier = 1;
        attackerTypes.forEach(atkType => {
            defenderTypes.forEach(defType => {
                if (chart[atkType] && chart[atkType][defType] !== undefined) {
                    multiplier *= chart[atkType][defType];
                }
            });
        });
        return multiplier;
    }

    updateHpBar(teamId, pokemon) {
        const el = document.getElementById(teamId);
        if (!el) return;

        const pct = (pokemon.hp / pokemon.maxHp) * 100;
        const bar = el.querySelector('.hp-bar');
        if (!bar) return;

        bar.style.width = `${pct}%`;

        if (pct < 30) bar.className = 'hp-bar hp-low';
        else if (pct < 60) bar.className = 'hp-bar hp-mid';
        else bar.className = 'hp-bar';
    }

    endBattle(winningTeam) {
        clearInterval(this.combatInterval);
        this.gameState = 'ENDED';
        this.updateStatus(`🏆 TEAM ${winningTeam} WINS!`);
        this.log(`🏆 TEAM ${winningTeam} VICTORIOUS! 🏆`);

        this.triggerChat('win', { team: winningTeam });
        setTimeout(() => this.triggerChat('win', { team: winningTeam }), 1000);
        setTimeout(() => this.triggerChat('win', { team: winningTeam }), 2000);

        // 배틀 결과 기록 API
        fetch('https://pkmon-payment-backend-api.onrender.com/api/battle-result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                battle_id: this.battle_id,
                winning_team: winningTeam,
                pokemon_a: this.teamA[0]?.name || 'Unknown',
                pokemon_b: this.teamB[0]?.name || 'Unknown',
                timestamp: Date.now()
            })
        }).catch(e => console.warn('[Battle] Failed to record results:', e));

        // 유저 베팅 결과 처리
        if (this.userBets.length > 0) {
            const userBet = this.userBets[this.userBets.length - 1];
            const didWin = userBet.team === winningTeam;
            const betAmount = parseFloat(userBet.amount);
            const totalPool = this.bets.A + this.bets.B;

            if (didWin) {
                setTimeout(() => this.showWinModal(betAmount), 1000);
            } else {
                setTimeout(() => this.showLoseModal(betAmount, totalPool), 1000);
            }
        }

        // 다음 사이클 시작
        setTimeout(() => {
            this.syncToUTC();
            this.startNewCycle();
        }, 10000);
    }

    showWinModal(betAmount) {
        const payout = (betAmount * 2).toFixed(2);
        const modal = document.createElement('div');
        modal.id = 'betResultModal';
        modal.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;justify-content:center;align-items:center;">
            <div style="background:linear-gradient(135deg,#0f1729,#1a2744);border-radius:20px;padding:2.5rem 2rem;width:340px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.6);border:1px solid rgba(16,185,129,0.3);">
                <div style="width:80px;height:80px;background:linear-gradient(135deg,#10B981,#059669);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;font-size:2.5rem;">🎉</div>
                <div style="font-size:1.4rem;font-weight:800;color:#fff;margin-bottom:0.75rem;">Congratulations!</div>
                <div style="font-size:1rem;color:#94a3b8;margin-bottom:0.5rem;">Bet placed successfully!</div>
                <div style="font-size:1.1rem;color:#10B981;font-weight:700;margin-bottom:1.75rem;">+${payout} RLO</div>
                <button id="claimRewardBtn" style="width:100%;padding:0.85rem;background:linear-gradient(135deg,#10B981,#059669);color:white;border:none;border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;">
                    🏆 Claim Reward
                </button>
            </div>
        </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('claimRewardBtn').addEventListener('click', async () => {
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
                <div style="font-size:1.4rem;font-weight:800;color:#fff;margin-bottom:0.75rem;">That's unfortunate!</div>
                <div style="font-size:1rem;color:#94a3b8;margin-bottom:1rem;">Would you like to try again?</div>
                <div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:0.75rem;margin-bottom:1.75rem;">
                    <div style="font-size:0.85rem;color:#64748b;margin-bottom:0.25rem;">Bet Pool</div>
                    <div style="font-size:1.1rem;color:#fbbf24;font-weight:700;">${totalPool.toFixed(2)} RLO</div>
                </div>
                <button onclick="document.getElementById('betResultModal').remove()" style="width:100%;padding:0.85rem;background:rgba(255,255,255,0.1);color:white;border:none;border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;">Close</button>
            </div>
        </div>
        `;
        document.body.appendChild(modal);
    }

    async claimReward(betAmount) {
        const payout = betAmount * 2;
        try {
            if (window.walletConnector) await window.walletConnector.switchToSepolia();
            const provider = new (_getEthers()).providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const userAddress = await signer.getAddress();

            const response = await fetch('https://pkmon-payment-backend-api.onrender.com/api/payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: userAddress, amount: payout, timestamp: Date.now() })
            });

            if (response.ok) {
                const data = await response.json();
                this.log(`🎉 Reward claimed! ${payout} RLO sent. TX: ${data.txHash?.slice(0, 10)}...`);
                const successModal = document.createElement('div');
                successModal.innerHTML = `
                <div style="position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;justify-content:center;align-items:center;">
                    <div style="background:linear-gradient(135deg,#0f1729,#1a2744);border-radius:20px;padding:2.5rem 2rem;width:340px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
                        <div style="width:80px;height:80px;background:linear-gradient(135deg,#10B981,#059669);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;font-size:2.5rem;">✅</div>
                        <div style="font-size:1.3rem;font-weight:800;color:#fff;margin-bottom:0.5rem;">Reward Sent!</div>
                        <div style="color:#10B981;font-weight:700;font-size:1.1rem;margin-bottom:1.5rem;">${payout} RLO → Your Wallet</div>
                        <button onclick="this.closest('div[style]').parentElement.remove()" style="width:100%;padding:0.85rem;background:linear-gradient(135deg,#10B981,#059669);color:white;border:none;border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;">OK</button>
                    </div>
                </div>
                `;
                document.body.appendChild(successModal);
            } else {
                throw new Error('Payout API failed');
            }
        } catch (error) {
            console.error('[Claim] failed:', error);
            this.log(`❌ Claim failed: ${error.message}`);
            alert('Claim failed. Please contact support.');
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
        if (isNaN(parsedAmount) || parsedAmount <= 0) return;
        if (parsedAmount > MAX_BET) {
            alert(`Max bet is ${MAX_BET} RLO.`);
            return;
        }

        // 온체인 RLO 전송
        const BET_RECEIVER = '0x2e06710f034190A1d6419Ed56A41b2Da82B3a922';
        const TOKEN_ADDRESS = '0x340eC38B76eF2074bfFC028c490941b8e34f9eb0';
        const ERC20_ABI = [
            { "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "name": "", "type": "uint8" }], "type": "function" },
            { "constant": false, "inputs": [{ "name": "_to", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "transfer", "outputs": [{ "name": "", "type": "bool" }], "type": "function" }
        ];

        try {
            if (window.walletConnector) await window.walletConnector.switchToSepolia();

            const provider = new (_getEthers()).providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new (_getEthers()).Contract(TOKEN_ADDRESS, ERC20_ABI, signer);
            const decimals = await contract.decimals();
            const amountWei = _getEthers().utils.parseUnits(parsedAmount.toString(), decimals);

            const tx = await contract.transfer(BET_RECEIVER, amountWei);
            this.log(`⏳ Sending ${parsedAmount} RLO... TX: ${tx.hash.slice(0, 10)}...`);

            await tx.wait();
            this.log(`✅ Bet confirmed! ${parsedAmount} RLO on Team ${team}`);

            this.bets[team] += parsedAmount;
            this.userBets.push({ team, amount: parsedAmount, token, txHash: tx.hash });
            this.updatePoolDisplay();
            this.triggerChat('bet_placed', { team, amount: parsedAmount });
        } catch (error) {
            console.error('[Bet] Failed to send:', error);
            this.log(`❌ Bet failed: ${error.message}`);
        }
    }

    updatePoolDisplay() {
        const total = this.bets.A + this.bets.B;
        this.elements.pool.textContent = total.toFixed(2);
    }

    updateStatus(text) {
        this.elements.status.textContent = text;
    }

    log(msg) {
        const line = document.createElement('div');
        line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        this.elements.log.prepend(line);
    }

    // Chat System
    processChat() {
        if (this.gameState === 'BETTING' && Math.random() > 0.5) {
            this.triggerChat('idle', {});
        }
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

        const entries = this.elements.chat.querySelectorAll('.chat-entry');
        if (entries.length > 50) {
            entries[0].remove();
        }
    }
}

// Global accessor
window.addEventListener('DOMContentLoaded', () => {
    window.battleEngine = new BattleEngine();
});
