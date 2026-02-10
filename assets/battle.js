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
        setInterval(() => this.processChat(), 3000); // More frequent chat

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
        this.combatInterval = setInterval(() => this.combatStep(), 2500); // Slightly slower for readability
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
        this.turn++;
        const attacker = p1.speed >= p2.speed ? (this.turn % 2 !== 0 ? p1 : p2) : (this.turn % 2 !== 0 ? p2 : p1);
        const defender = attacker === p1 ? p2 : p1;
        const attackerTeam = attacker === p1 ? 'A' : 'B';
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

        // Vivid Battle Log with move name
        let logMsg = `⚡ ${attacker.name} used ${move.name}!`;
        this.log(logMsg);

        if (crit) this.log('   💥 CRITICAL HIT!');
        if (typeBonus > 1) this.log('   ✨ Super effective!');
        if (typeBonus < 1) this.log('   🛡️ Not very effective...');
        this.log(`   └─ ${defender.name} took ${damage} damage! (HP: ${defender.hp}/${defender.maxHp})`);

        // Update UI with visual effect
        this.updateHpBar(defenderTeam, defender);
        this.showAttackEffect(defenderTeam, crit);

        // Chat Reactions (more frequent)
        if (crit) {
            this.triggerChat('crit_hit', { damage: damage });
        }
        if (typeBonus > 1) {
            this.triggerChat('super_effective', {});
        }
        if (move.name) {
            this.triggerChat('move_used', { move: move.name });
        }

        // Low HP warning
        const hpPercent = (defender.hp / defender.maxHp) * 100;
        if (hpPercent < 30 && hpPercent > 0) {
            this.triggerChat('low_hp', {});
        }
    }

    showAttackEffect(targetTeamId, isCrit) {
        const el = document.getElementById(targetTeamId);
        if (!el) return;

        // Flash effect
        el.style.transition = 'filter 0.2s';
        el.style.filter = isCrit ? 'brightness(2) saturate(2)' : 'brightness(1.5)';

        setTimeout(() => {
            el.style.filter = 'brightness(1)';
        }, 200);

        // Shake animation
        const sprite = el.querySelector('.pokemon-sprite');
        if (sprite) {
            sprite.style.animation = 'shake 0.3s';
            setTimeout(() => {
                sprite.style.animation = '';
            }, 300);
        }
    }

    checkTypeEffectiveness(attackerTypes, defenderTypes) {
        // Expanded type chart
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

        // Multiple trainers react to the win
        setTimeout(() => this.triggerChat('win', { team: winningTeam }), 1000);
        setTimeout(() => this.triggerChat('win', { team: winningTeam }), 2000);

        // Payout Logic
        if (this.userBets.length > 0) {
            const winners = this.userBets.filter(b => b.team === winningTeam);
            if (winners.length > 0) {
                setTimeout(() => alert(`🎉 You won! Payout sent to wallet.`), 1000);
            } else {
                setTimeout(() => alert(`😢 Team ${winningTeam} won. Better luck next time.`), 1000);
            }
        }

        // Restart Cycle after delay
        setTimeout(() => {
            this.syncToUTC(); // Resync to next UTC slot
            this.startNewCycle();
        }, 10000);
    }

    // Betting
    placeBet(team, amount, token) {
        if (this.gameState !== 'BETTING') {
            alert("Betting is closed! Battle is in progress.");
            return;
        }

        this.bets[team] += parseFloat(amount);
        this.userBets.push({ team, amount, token });

        this.updatePoolDisplay();
        this.log(`💰 New Bet: ${amount} ${token} on Team ${team}`);
        this.triggerChat('bet_placed', { team: team, amount: amount });
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
}

// Global accessor
window.addEventListener('DOMContentLoaded', () => {
    window.battleEngine = new BattleEngine();
});
