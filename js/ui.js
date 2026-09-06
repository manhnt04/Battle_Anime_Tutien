import { audio } from './audio.js';
import { WeaponShowcase } from './showcase.js';

export class UI {
    constructor(game) {
        this.game = game;
        window.ui = this;
        this.lastKillCount = 0;
        this.healthLagPct = 100;
        this.armorLagPct = 0;
        this.lobbyTimer = null;
        this.lobbyCountdownInterval = null;
        this.isTransitioning = false;
        this.showcase = new WeaponShowcase();

        this.setupEventListeners();
        this.loadStats();
    }

    setupEventListeners() {
        // Main menu
        document.getElementById('btn-play').addEventListener('click', () => this.enterLobby());
        const btnShowcase = document.getElementById('btn-showcase');
        if (btnShowcase) {
            btnShowcase.addEventListener('click', () => {
                if (this.showcase) this.showcase.open();
            });
        }
        document.getElementById('btn-controls').addEventListener('click', () => this.showScreen('controls-screen'));
        document.getElementById('btn-settings').addEventListener('click', () => this.showScreen('settings-screen'));

        // Lobby buttons
        const btnLobbyStart = document.getElementById('btn-lobby-start');
        if (btnLobbyStart) {
            btnLobbyStart.addEventListener('click', () => this.startMatchFromLobby());
        }
        const btnLobbyCancel = document.getElementById('btn-lobby-cancel');
        if (btnLobbyCancel) {
            btnLobbyCancel.addEventListener('click', () => this.cancelLobby());
        }

        // Back buttons
        document.getElementById('btn-controls-back').addEventListener('click', () => this.showScreen('main-menu'));
        document.getElementById('btn-settings-back').addEventListener('click', () => this.showScreen('main-menu'));

        // Pause menu
        document.getElementById('btn-resume').addEventListener('click', () => this.game.pause());
        document.getElementById('btn-pause-settings').addEventListener('click', () => this.showScreen('settings-screen'));
        document.getElementById('btn-quit').addEventListener('click', () => this.fadeTransition(() => this.quitToMenu()));

        // Victory / Game Over
        document.getElementById('btn-victory-restart').addEventListener('click', () => this.fadeTransition(() => this.startGame()));
        document.getElementById('btn-victory-menu').addEventListener('click', () => this.fadeTransition(() => this.quitToMenu()));
        document.getElementById('btn-gameover-restart').addEventListener('click', () => this.fadeTransition(() => this.startGame()));
        document.getElementById('btn-gameover-menu').addEventListener('click', () => this.fadeTransition(() => this.quitToMenu()));

        // Settings
        document.getElementById('volume-master').addEventListener('input', (e) => {
            audio.setMasterVolume(e.target.value / 100);
        });
        document.getElementById('volume-music').addEventListener('input', (e) => {
            audio.setMusicVolume(e.target.value / 100);
        });
        document.getElementById('volume-sfx').addEventListener('input', (e) => {
            audio.setSfxVolume(e.target.value / 100);
        });
        document.getElementById('screenshake').addEventListener('input', (e) => {
            this.game.screenShakeEnabled = e.target.value > 0;
        });
        document.getElementById('show-fps').addEventListener('change', (e) => {
            this.game.showFps = e.target.checked;
        });
        document.getElementById('fullscreen').addEventListener('change', (e) => {
            if (e.target.checked) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
        });
    }

    fadeTransition(callback, duration = 350) {
        if (this.isTransitioning) {
            if (callback) callback();
            return;
        }
        this.isTransitioning = true;
        const overlay = document.getElementById('screen-transition');
        if (!overlay) {
            if (callback) callback();
            this.isTransitioning = false;
            return;
        }

        overlay.classList.add('fade-out');
        setTimeout(() => {
            if (callback) callback();
            setTimeout(() => {
                overlay.classList.remove('fade-out');
                setTimeout(() => {
                    this.isTransitioning = false;
                }, duration);
            }, 60);
        }, duration);
    }

    enterLobby() {
        this.fadeTransition(() => {
            this.showScreen('lobby-screen');
            this.startLobbyMatchmaking();
        });
    }

    startLobbyMatchmaking() {
        this.clearLobbyTimers();
        let count = 3;
        const countEl = document.getElementById('lobby-player-count');
        const barEl = document.getElementById('lobby-progress-bar');
        const msgEl = document.getElementById('lobby-status-msg');
        const cdEl = document.getElementById('lobby-countdown');

        if (countEl) countEl.textContent = count;
        if (barEl) barEl.style.width = `${(count / 10) * 100}%`;
        if (msgEl) msgEl.textContent = 'Đang dò tìm cao thủ võ lâm...';
        if (cdEl) cdEl.textContent = '3';

        this.lobbyTimer = setInterval(() => {
            count += 1;
            if (count >= 10) {
                count = 10;
                clearInterval(this.lobbyTimer);
                this.lobbyTimer = null;
                if (msgEl) msgEl.textContent = 'Đã đủ 10 quần hùng! Chuẩn bị truyền tống...';
                audio.playGong();

                let cd = 3;
                if (cdEl) cdEl.textContent = cd;
                this.lobbyCountdownInterval = setInterval(() => {
                    cd--;
                    if (cdEl) cdEl.textContent = cd;
                    if (cd <= 0) {
                        clearInterval(this.lobbyCountdownInterval);
                        this.lobbyCountdownInterval = null;
                        this.startMatchFromLobby();
                    }
                }, 1000);
            }
            if (countEl) countEl.textContent = count;
            if (barEl) barEl.style.width = `${(count / 10) * 100}%`;
        }, 220);
    }

    clearLobbyTimers() {
        if (this.lobbyTimer) {
            clearInterval(this.lobbyTimer);
            this.lobbyTimer = null;
        }
        if (this.lobbyCountdownInterval) {
            clearInterval(this.lobbyCountdownInterval);
            this.lobbyCountdownInterval = null;
        }
    }

    startMatchFromLobby() {
        this.clearLobbyTimers();
        this.fadeTransition(() => {
            this.startGame();
        });
    }

    cancelLobby() {
        this.clearLobbyTimers();
        this.fadeTransition(() => {
            this.quitToMenu();
        });
    }

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(id);
        if (target) target.classList.add('active');
    }

    startGame() {
        this.lastKillCount = 0;
        this.healthLagPct = 100;
        this.armorLagPct = 0;
        const killBanner = document.getElementById('hud-kill-banner');
        if (killBanner) killBanner.classList.remove('kill-pop');
        const killCountEl = document.getElementById('hud-kill-count');
        if (killCountEl) killCountEl.textContent = '0';

        this.showScreen('hud');
        this.game.start();
    }

    quitToMenu() {
        this.clearLobbyTimers();
        this.game.state = 'menu';
        this.showScreen('main-menu');
    }

    updateHUD() {
        if (this.game.state !== 'playing') return;

        const player = this.game.player;
        if (!player) return;

        // Health & Lag Bar
        const healthPct = Math.max(0, Math.min(100, (player.health / player.maxHealth) * 100));
        const healthFill = document.getElementById('health-fill');
        const healthLag = document.getElementById('health-lag');
        if (healthFill) {
            healthFill.style.width = `${healthPct}%`;
            healthFill.classList.toggle('low', healthPct <= 25);
        }
        if (healthLag) {
            if (this.healthLagPct > healthPct) {
                this.healthLagPct = Math.max(healthPct, this.healthLagPct - 0.7);
            } else {
                this.healthLagPct = healthPct;
            }
            healthLag.style.width = `${this.healthLagPct}%`;
        }
        const healthText = document.getElementById('health-text');
        if (healthText) healthText.textContent = `${Math.ceil(player.health)}/${player.maxHealth}`;

        // Armor & Lag Bar
        const armorPct = Math.max(0, Math.min(100, (player.armor / player.maxArmor) * 100));
        const armorFill = document.getElementById('armor-fill');
        const armorLag = document.getElementById('armor-lag');
        if (armorFill) armorFill.style.width = `${armorPct}%`;
        if (armorLag) {
            if (this.armorLagPct > armorPct) {
                this.armorLagPct = Math.max(armorPct, this.armorLagPct - 0.7);
            } else {
                this.armorLagPct = armorPct;
            }
            armorLag.style.width = `${this.armorLagPct}%`;
        }
        const armorText = document.getElementById('armor-text');
        if (armorText) armorText.textContent = `${Math.ceil(player.armor)}/${player.maxArmor}`;

        // Weapon
        const weapon = player.inventory.getCurrentWeapon();
        if (weapon) {
            document.getElementById('weapon-name').textContent = weapon.name;
            document.getElementById('weapon-ammo').textContent = weapon.getAmmoString();
        }

        // Players alive
        document.getElementById('hud-players-count').textContent = this.game.getAliveCount();

        // Kills & Prominent Kill Banner
        document.getElementById('hud-kills').textContent = player.kills;
        const hudKillCount = document.getElementById('hud-kill-count');
        if (hudKillCount) hudKillCount.textContent = player.kills;

        if (player.kills > this.lastKillCount) {
            this.lastKillCount = player.kills;
            const killBanner = document.getElementById('hud-kill-banner');
            if (killBanner) {
                killBanner.classList.add('kill-pop');
                setTimeout(() => killBanner.classList.remove('kill-pop'), 400);
            }
            audio.playGong();
            this.addNotification(`⚔️ ĐÃ TRẢM SÁT CAO THỦ THỨ ${player.kills}!`, 'warning');
        }

        // Zone timer
        const timer = Math.max(0, Math.ceil(this.game.safeZone.timeUntilShrink / 1000));
        document.getElementById('hud-zone-timer').textContent = timer;

        // Minimap Safe Zone Direction & Distance Indicator
        const zoneInfo = document.getElementById('minimap-zone-info');
        const zoneText = document.getElementById('minimap-zone-text');
        if (zoneInfo && zoneText && this.game.safeZone) {
            const distToCenter = Math.hypot(player.x - this.game.safeZone.x, player.y - this.game.safeZone.y);
            const isInside = distToCenter <= this.game.safeZone.radius;
            if (!isInside) {
                const excessMeters = Math.round((distToCenter - this.game.safeZone.radius) / 10);
                zoneInfo.className = 'minimap-zone-info out-zone';
                zoneText.textContent = `⚠️ NGOÀI VÒNG: ${excessMeters}m`;
            } else {
                zoneInfo.className = 'minimap-zone-info in-zone';
                zoneText.textContent = `✅ VỊ TRÍ AN TOÀN`;
            }
        }

        // Weapon slots
        document.querySelectorAll('.weapon-slot').forEach((slot, i) => {
            slot.classList.toggle('active', i === player.inventory.currentSlot);
            const w = player.inventory.weapons[i];
            slot.textContent = w ? (w.icon || w.name[0]) : '';
        });

        // Update Skill Bar (Q, E, R)
        if (player && player.inventory) {
            const currentWeapon = player.inventory.getCurrentWeapon();
            const skills = currentWeapon && currentWeapon.skills ? currentWeapon.skills : [];
            const cds = player.skillCooldowns || [0, 0, 0];

            for (let i = 0; i < 3; i++) {
                const slotEl = document.getElementById(`hud-skill-${i}`);
                const nameEl = document.getElementById(`hud-skill-name-${i}`);
                const cdEl = document.getElementById(`hud-skill-cd-${i}`);
                const skill = skills[i];

                if (!slotEl || !nameEl || !cdEl) continue;

                if (skill) {
                    slotEl.style.opacity = '1';
                    nameEl.textContent = skill.name;
                    slotEl.title = `${skill.name}: ${skill.desc} (CD: ${skill.cd / 1000}s)`;

                    const remainingMs = cds[i] || 0;
                    if (remainingMs > 0) {
                        cdEl.classList.add('on-cooldown');
                        const pct = Math.min(100, Math.max(0, (remainingMs / skill.cd) * 100));
                        cdEl.style.height = `${pct}%`;
                        cdEl.textContent = (remainingMs / 1000).toFixed(1) + 's';
                    } else {
                        cdEl.classList.remove('on-cooldown');
                        cdEl.style.height = '0%';
                        cdEl.textContent = '';
                    }
                } else {
                    if (i === 2 && currentWeapon && currentWeapon.type === 'ranged') {
                        slotEl.style.opacity = '0.7';
                        nameEl.textContent = 'VẬN KHÍ';
                        cdEl.classList.remove('on-cooldown');
                        cdEl.style.height = '0%';
                        cdEl.textContent = '';
                    } else {
                        slotEl.style.opacity = '0.35';
                        nameEl.textContent = '---';
                        cdEl.classList.remove('on-cooldown');
                        cdEl.style.height = '0%';
                        cdEl.textContent = '';
                    }
                }
            }
        }

        // Update Mobile Controls (Icons, Cooldowns, Medicine count)
        const badgeHeal = document.getElementById('badge-mobile-heal');
        if (badgeHeal) {
            badgeHeal.textContent = player.medicines !== undefined ? player.medicines : 0;
            badgeHeal.style.opacity = (player.medicines || 0) > 0 ? '1' : '0.5';
        }

        const mobileAttackIcon = document.getElementById('mobile-attack-icon');
        if (mobileAttackIcon) {
            mobileAttackIcon.textContent = weapon ? (weapon.icon || '⚔️') : '👊';
        }

        if (player && player.inventory) {
            const currentWeapon = player.inventory.getCurrentWeapon();
            const skills = currentWeapon && currentWeapon.skills ? currentWeapon.skills : [];
            const cds = player.skillCooldowns || [0, 0, 0];

            for (let i = 0; i < 3; i++) {
                const mobileBtn = document.getElementById(`btn-mobile-skill-${i}`);
                const mobileIcon = document.getElementById(`mobile-skill-icon-${i}`);
                const mobileName = document.getElementById(`mobile-skill-name-${i}`);
                const mobileCd = document.getElementById(`mobile-skill-cd-${i}`);
                const skill = skills[i];

                if (!mobileBtn || !mobileIcon || !mobileName || !mobileCd) continue;

                if (skill) {
                    mobileBtn.style.opacity = '1';
                    mobileBtn.style.pointerEvents = 'auto';
                    mobileName.textContent = skill.sub ? skill.sub.split('(')[0].trim() : `CHIÊU ${i + 1}`;
                    const remainingMs = cds[i] || 0;
                    if (remainingMs > 0) {
                        mobileBtn.classList.add('cooling-down');
                        mobileCd.classList.add('active');
                        mobileCd.textContent = (remainingMs / 1000).toFixed(1);
                    } else {
                        mobileBtn.classList.remove('cooling-down');
                        mobileCd.classList.remove('active');
                        mobileCd.textContent = '';
                    }
                } else {
                    mobileBtn.style.opacity = '0.35';
                    mobileBtn.classList.remove('cooling-down');
                    mobileCd.classList.remove('active');
                    mobileCd.textContent = '';
                    mobileName.textContent = '---';
                }
            }
        }

        // Damage indicator
        const dmgInd = document.getElementById('damage-indicator');
        if (Date.now() - player.lastDamageTime < 200) {
            dmgInd.classList.add('active');
        } else {
            dmgInd.classList.remove('active');
        }
    }

    showVictory() {
        this.saveStats(true);
        this.fadeTransition(() => {
            document.getElementById('victory-kills').textContent = this.game.player.kills;
            const mins = Math.floor(this.game.gameTime / 60000);
            const secs = Math.floor((this.game.gameTime % 60000) / 1000);
            document.getElementById('victory-time').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            this.showScreen('victory-screen');
        }, 450);
    }

    showGameOver(place) {
        this.saveStats(false);
        this.fadeTransition(() => {
            document.getElementById('gameover-kills').textContent = this.game.player.kills;
            document.getElementById('gameover-place').textContent = `#${place}`;
            this.showScreen('gameover-screen');
        }, 450);
    }

    addNotification(text, type = 'info') {
        const container = document.getElementById('notifications');
        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.textContent = text;
        container.appendChild(notif);
        setTimeout(() => notif.remove(), 3000);
    }

    loadStats() {
        const stats = JSON.parse(localStorage.getItem('circleRoyaleStats') || '{"wins":0,"kills":0,"played":0}');
        document.getElementById('stat-wins').textContent = stats.wins;
        document.getElementById('stat-kills').textContent = stats.kills;
        document.getElementById('stat-played').textContent = stats.played;
    }

    saveStats(won) {
        const stats = JSON.parse(localStorage.getItem('circleRoyaleStats') || '{"wins":0,"kills":0,"played":0}');
        stats.played++;
        stats.kills += this.game.player.kills;
        if (won) stats.wins++;
        localStorage.setItem('circleRoyaleStats', JSON.stringify(stats));
        this.loadStats();
    }
}
