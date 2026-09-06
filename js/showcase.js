import { WEAPONS } from './weapon.js';
import { audio } from './audio.js';

export class WeaponShowcase {
    constructor() {
        this.modal = document.getElementById('showcase-modal');
        this.canvas = document.getElementById('showcase-canvas');
        this.ctx = (this.canvas && typeof this.canvas.getContext === 'function')
            ? this.canvas.getContext('2d')
            : null;

        this.selectedWeaponKey = 'TRUONG_KIEM';
        this.active = false;
        this.animFrameId = null;

        // Arena Training Entities
        this.player = {
            x: 110,
            y: 170,
            angle: 0,
            radius: 18,
            color: '#00e5ff',
            combo: 0
        };

        this.dummy = {
            x: 340,
            y: 170,
            radius: 22,
            maxHp: 500,
            hp: 500,
            hitFlash: 0,
            shakeX: 0,
            shakeY: 0,
            buffs: { stun: 0, slow: 0, armorShred: 0 }
        };

        this.particles = [];
        this.popups = [];
        this.activeVFX = [];
        this.lastTime = performance.now();

        this.setupUI();
    }

    setupUI() {
        // Tab buttons
        const tabs = document.querySelectorAll('.weapon-tab-btn');
        tabs.forEach((btn) => {
            btn.addEventListener('click', () => {
                const wkey = btn.dataset.weapon;
                this.selectWeapon(wkey);
            });
        });

        // Close button
        const btnClose = document.getElementById('btn-showcase-close');
        if (btnClose) {
            btnClose.addEventListener('click', () => this.close());
        }

        // Action buttons
        const btnAtk = document.getElementById('btn-test-attack');
        if (btnAtk) btnAtk.addEventListener('click', () => this.triggerAttack());

        const btnS0 = document.getElementById('btn-test-skill-0');
        if (btnS0) btnS0.addEventListener('click', () => this.triggerSkill(0));

        const btnS1 = document.getElementById('btn-test-skill-1');
        if (btnS1) btnS1.addEventListener('click', () => this.triggerSkill(1));

        const btnS2 = document.getElementById('btn-test-skill-2');
        if (btnS2) btnS2.addEventListener('click', () => this.triggerSkill(2));

        const btnReset = document.getElementById('btn-reset-dummy');
        if (btnReset) btnReset.addEventListener('click', () => this.resetDummy());
    }

    open() {
        if (!this.modal) return;
        this.modal.classList.add('active');
        this.active = true;
        this.selectWeapon(this.selectedWeaponKey);
        this.resetDummy();
        this.lastTime = performance.now();
        this.loop();
    }

    close() {
        if (!this.modal) return;
        this.modal.classList.remove('active');
        this.active = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
    }

    selectWeapon(key) {
        if (!WEAPONS[key]) return;
        this.selectedWeaponKey = key;
        const data = WEAPONS[key];

        // Update tabs active state
        document.querySelectorAll('.weapon-tab-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.weapon === key);
        });

        // Update Weapon Header & Stats
        const nameEl = document.getElementById('showcase-weapon-name');
        const tagEl = document.getElementById('showcase-weapon-tag');
        const descEl = document.getElementById('showcase-weapon-desc');
        const dmgEl = document.getElementById('showcase-stat-dmg');
        const rangeEl = document.getElementById('showcase-stat-range');
        const speedEl = document.getElementById('showcase-stat-speed');

        if (nameEl) nameEl.textContent = data.name;
        if (tagEl) {
            const rarText = data.rarity === 'legendary' ? 'Huyền Thoại (Legendary)' : data.rarity === 'rare' ? 'Quý Hiếm' : 'Phổ Thông';
            tagEl.textContent = `${rarText} • ${data.tag || ''}`;
            if (data.rarity === 'legendary') {
                tagEl.style.color = '#ffd700';
                tagEl.style.textShadow = '0 0 8px rgba(255, 215, 0, 0.6)';
            } else {
                tagEl.style.color = '';
                tagEl.style.textShadow = '';
            }
        }
        if (descEl) descEl.textContent = `"${data.lore || 'Tuyệt thế binh khí trong chốn võ lâm.'}"`;
        if (dmgEl) dmgEl.textContent = data.damage;
        if (rangeEl) rangeEl.textContent = `${data.range}px`;
        if (speedEl) speedEl.textContent = `${data.fireRate}ms`;

        // Update Skills Card List
        const listEl = document.getElementById('showcase-skills-list');
        if (listEl) {
            listEl.innerHTML = '';

            // Đánh thường card
            const normalCard = document.createElement('div');
            normalCard.className = 'skill-info-card';
            normalCard.style.borderLeftColor = data.color;
            normalCard.innerHTML = `
                <div class="skill-card-top">
                    <span class="skill-card-title">⚔️ ĐÁNH THƯỜNG</span>
                    <span class="skill-card-cd">Hồi: ${data.fireRate}ms</span>
                </div>
                <p class="skill-card-desc">Tầm đánh ${data.range}px, gây ${data.damage} sát thương.</p>
            `;
            listEl.appendChild(normalCard);

            // Skills cards
            const skills = data.skills || [];
            skills.forEach((s, idx) => {
                const keyLabel = idx === 0 ? 'Q' : idx === 1 ? 'E' : 'R';
                const isUlt = idx === 2;
                const card = document.createElement('div');
                card.className = 'skill-info-card';
                card.style.borderLeftColor = isUlt ? '#f0533b' : data.color;
                card.innerHTML = `
                    <div class="skill-card-top">
                        <span class="skill-card-title">${isUlt ? '🔥 TUYỆT KỸ' : '💥 CHIÊU ' + (idx + 1)} [${keyLabel}]: ${s.name}</span>
                        <span class="skill-card-cd">CD: ${s.cd / 1000}s</span>
                    </div>
                    <p class="skill-card-desc">${s.desc}</p>
                `;
                listEl.appendChild(card);
            });
        }

        // Update Buttons state
        const skills = data.skills || [];
        const btnS0 = document.getElementById('btn-test-skill-0');
        const btnS1 = document.getElementById('btn-test-skill-1');
        const btnS2 = document.getElementById('btn-test-skill-2');

        if (btnS0) {
            btnS0.style.display = skills[0] ? 'inline-block' : 'none';
            if (skills[0]) btnS0.textContent = `💥 Q: ${skills[0].name}`;
        }
        if (btnS1) {
            btnS1.style.display = skills[1] ? 'inline-block' : 'none';
            if (skills[1]) btnS1.textContent = `💥 E: ${skills[1].name}`;
        }
        if (btnS2) {
            btnS2.style.display = skills[2] ? 'inline-block' : 'none';
            if (skills[2]) btnS2.textContent = `🔥 R: ${skills[2].name}`;
        }
    }

    resetDummy() {
        this.dummy.hp = this.dummy.maxHp;
        this.dummy.buffs = { stun: 0, slow: 0, armorShred: 0 };
        this.updateDummyUI();
        this.addPopup(this.dummy.x, this.dummy.y - 30, '✨ ĐÃ HỒI PHỤC', '#4caf50');
    }

    damageDummy(amount, color = '#ffd700', text = null) {
        this.dummy.hp = Math.max(0, this.dummy.hp - amount);
        this.dummy.hitFlash = 120;
        this.dummy.shakeX = (Math.random() - 0.5) * 8;
        this.dummy.shakeY = (Math.random() - 0.5) * 8;

        this.addPopup(this.dummy.x + (Math.random() - 0.5) * 30, this.dummy.y - 25, text || `-${amount}`, color);
        this.spawnBloodSparks(this.dummy.x, this.dummy.y, color);
        audio.playHit();
        this.updateDummyUI();
    }

    updateDummyUI() {
        const textEl = document.getElementById('dummy-hp-text');
        const barEl = document.getElementById('dummy-hp-bar');
        if (textEl) textEl.textContent = `${this.dummy.hp}/${this.dummy.maxHp}`;
        if (barEl) {
            const pct = (this.dummy.hp / this.dummy.maxHp) * 100;
            barEl.style.width = `${pct}%`;
        }
    }

    addPopup(x, y, text, color) {
        this.popups.push({
            x,
            y,
            text,
            color,
            life: 1.0,
            vy: -1.2
        });
    }

    spawnBloodSparks(x, y, color) {
        for (let i = 0; i < 12; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 2 + Math.random() * 5;
            this.particles.push({
                x,
                y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                color,
                life: 1.0,
                decay: 0.04 + Math.random() * 0.04,
                radius: 2.5 + Math.random() * 2
            });
        }
    }

    triggerAttack() {
        const w = WEAPONS[this.selectedWeaponKey];
        if (!w) return;

        audio.playShoot(w.name);

        if (this.selectedWeaponKey === 'TRUONG_KIEM') {
            this.player.combo = ((this.player.combo || 0) + 1) % 3;
            this.activeVFX.push({
                type: 'slash',
                x: (this.player.x + this.dummy.x) / 2,
                y: this.player.y,
                angle: (this.player.combo - 1) * 0.35,
                radius: 50,
                color: w.color,
                life: 1.0
            });
            this.damageDummy(w.damage, w.color);
        } else if (this.selectedWeaponKey === 'THIET_PHIEN') {
            this.activeVFX.push({
                type: 'boomerang_demo',
                startX: this.player.x,
                startY: this.player.y,
                targetX: this.dummy.x,
                targetY: this.dummy.y,
                progress: 0,
                color: w.color,
                damage: w.damage
            });
        } else if (this.selectedWeaponKey === 'LONG_UYET_DAO') {
            this.activeVFX.push({
                type: 'heavy_slash',
                x: this.dummy.x,
                y: this.dummy.y,
                color: '#f0533b',
                life: 1.0
            });
            this.damageDummy(w.damage, '#f0533b');
        } else if (this.selectedWeaponKey === 'MA_THIEN_THUONG') {
            this.activeVFX.push({
                type: 'spear_thrust',
                x1: this.player.x,
                y1: this.player.y,
                x2: this.dummy.x + 30,
                y2: this.dummy.y,
                color: '#8b5cf6',
                life: 1.0
            });
            this.damageDummy(w.damage, '#8b5cf6');
        } else if (this.selectedWeaponKey === 'BACH_HOP_CUNG') {
            this.activeVFX.push({
                type: 'arrow',
                x: this.player.x,
                y: this.player.y,
                targetX: this.dummy.x,
                targetY: this.dummy.y,
                color: '#4caf6d',
                damage: w.damage
            });
        } else if (this.selectedWeaponKey === 'ZANGETSU') {
            this.activeVFX.push({
                type: 'getsuga_demo',
                x: this.player.x + 20,
                y: this.player.y,
                targetX: this.dummy.x,
                targetY: this.dummy.y,
                color: '#ff1744',
                damage: w.damage
            });
            this.activeVFX.push({
                type: 'slash',
                x: (this.player.x + this.dummy.x) / 2,
                y: this.player.y,
                angle: 0.2,
                radius: 65,
                color: '#111111',
                life: 1.0
            });
        } else if (this.selectedWeaponKey === 'ONE_FOR_ALL') {
            this.activeVFX.push({
                type: 'smash_punch',
                x: this.dummy.x,
                y: this.dummy.y,
                color: '#00e676',
                life: 1.0,
                radius: 50
            });
            this.dummy.shakeX = 14;
            const isStun = Math.random() < 0.3;
            this.damageDummy(w.damage, '#00e676', `💥 DETROIT SMASH -${w.damage}`);
            if (isStun) {
                this.addPopup(this.dummy.x, this.dummy.y - 45, '💫 CHOÁNG 0.5s', '#ffd700');
            }
        } else if (this.selectedWeaponKey === 'KATON') {
            for (let ang of [-0.25, 0, 0.25]) {
                this.activeVFX.push({
                    type: 'kunai_projectile',
                    x: this.player.x,
                    y: this.player.y,
                    angle: ang,
                    color: '#2979ff',
                    damage: 35
                });
            }
        } else if (this.selectedWeaponKey === 'EXCALIBUR') {
            this.activeVFX.push({
                type: 'heavy_slash',
                x: this.dummy.x,
                y: this.dummy.y,
                color: '#ffd700',
                life: 1.0
            });
            this.damageDummy(w.damage, '#ffd700', `✨ INVISIBLE AIR -${w.damage}`);
            if (Math.random() < 0.2) {
                this.activeVFX.push({
                    type: 'arc_arrow',
                    startX: this.player.x,
                    startY: this.player.y,
                    targetX: this.dummy.x,
                    targetY: this.dummy.y,
                    progress: 0,
                    color: '#e0f7fa'
                });
            }
        } else if (this.selectedWeaponKey === 'GATE_OF_BABYLON') {
            this.activeVFX.push({
                type: 'babylon_shot',
                startX: this.player.x - 20,
                startY: this.player.y - 20 + Math.random() * 40,
                x: this.player.x - 20,
                y: this.player.y - 20 + Math.random() * 40,
                targetX: this.dummy.x,
                targetY: this.dummy.y,
                color: '#ffd700',
                damage: w.damage
            });
        }
    }

    triggerSkill(index) {
        const w = WEAPONS[this.selectedWeaponKey];
        if (!w || !w.skills || !w.skills[index]) return;
        audio.playShoot('KIEM_KHI');

        switch (this.selectedWeaponKey) {
            case 'TRUONG_KIEM':
                if (index === 0) {
                    // Q: Phong Kiếm Thuấn Bộ
                    this.activeVFX.push({
                        type: 'dash_trail',
                        x1: this.player.x,
                        y1: this.player.y,
                        x2: this.dummy.x + 40,
                        y2: this.dummy.y,
                        color: '#4aa8ff',
                        life: 1.0
                    });
                    this.damageDummy(35, '#4aa8ff', '⚡ THUẤN BỘ -35');
                } else if (index === 1) {
                    // E: Kiếm Khí Hộ Thể
                    this.activeVFX.push({
                        type: 'sword_shield',
                        x: this.player.x,
                        y: this.player.y,
                        duration: 3000,
                        elapsed: 0,
                        color: '#4aa8ff'
                    });
                    this.addPopup(this.player.x, this.player.y - 30, '🛡️ HỘ THỂ GIẢM 30%', '#4aa8ff');
                }
                break;

            case 'THIET_PHIEN':
                if (index === 0) {
                    // Q: Phong Hỏa Liên Thành
                    this.activeVFX.push({
                        type: 'fire_ring',
                        x: this.dummy.x,
                        y: this.dummy.y,
                        radius: 65,
                        duration: 3000,
                        elapsed: 0,
                        color: '#ff7a45'
                    });
                    this.damageDummy(15, '#ff7a45', '🔥 PHONG HỎA -15');
                } else if (index === 1) {
                    // E: Vô Ảnh Phiến
                    for (let ang of [-0.35, 0, 0.35]) {
                        this.activeVFX.push({
                            type: 'fan_projectile',
                            x: this.player.x,
                            y: this.player.y,
                            angle: ang,
                            color: '#ff7a45',
                            life: 1.0
                        });
                    }
                    this.damageDummy(30, '#ff7a45', '🪭 VÔ ẢNH PHIẾN -30');
                }
                break;

            case 'LONG_UYET_DAO':
                if (index === 0) {
                    // Q: Long Quyển Phong Bạo
                    this.activeVFX.push({
                        type: 'tornado',
                        x: this.dummy.x,
                        y: this.dummy.y,
                        radius: 50,
                        duration: 2500,
                        elapsed: 0,
                        color: '#f0533b'
                    });
                    this.damageDummy(20, '#f0533b', '🌪️ CUỒNG PHONG -20');
                } else if (index === 1) {
                    // E: Uy Long Trảm
                    this.activeVFX.push({
                        type: 'leap_slam',
                        x: this.dummy.x,
                        y: this.dummy.y,
                        life: 1.0,
                        color: '#f0533b'
                    });
                    this.damageDummy(60, '#f0533b', '💥 UY LONG TRẢM -60!');
                    this.addPopup(this.dummy.x, this.dummy.y - 45, '💫 CHOÁNG 1s', '#ffd700');
                } else if (index === 2) {
                    // R: Huyết Long Hộ Thể
                    this.activeVFX.push({
                        type: 'blood_aura',
                        x: this.player.x,
                        y: this.player.y,
                        duration: 4000,
                        elapsed: 0,
                        color: '#f0533b'
                    });
                    this.addPopup(this.player.x, this.player.y - 30, '🩸 HUYẾT LONG +50% CÔNG & HÚT MÁU', '#f0533b');
                }
                break;

            case 'MA_THIEN_THUONG':
                if (index === 0) {
                    // Q: Quỷ Ảnh Liên Hoàn Thương
                    this.activeVFX.push({
                        type: 'ghost_spears',
                        x: this.dummy.x,
                        y: this.dummy.y,
                        color: '#8b5cf6',
                        life: 1.0
                    });
                    this.damageDummy(25, '#8b5cf6', '🔱 QUỶ ẢNH -25');
                    this.addPopup(this.dummy.x, this.dummy.y - 45, '🛡️ PHÁ GIÁP 30%', '#8b5cf6');
                } else if (index === 1) {
                    // E: Địa Ngục Thương Trận
                    this.activeVFX.push({
                        type: 'hell_zone',
                        x: this.dummy.x,
                        y: this.dummy.y,
                        radius: 60,
                        duration: 3500,
                        elapsed: 0,
                        color: '#8b5cf6'
                    });
                    this.damageDummy(15, '#8b5cf6', '🔥 ĐỊA NGỤC -15');
                } else if (index === 2) {
                    // R: Ma Vương Giáng Thế
                    this.activeVFX.push({
                        type: 'demon_form',
                        x: this.player.x,
                        y: this.player.y,
                        duration: 5000,
                        elapsed: 0,
                        color: '#8b5cf6'
                    });
                    this.addPopup(this.player.x, this.player.y - 30, '👑 MA VƯƠNG GIÁNG THẾ (x2 SÁT THƯƠNG)', '#8b5cf6');
                }
                break;

            case 'BACH_HOP_CUNG':
                if (index === 0) {
                    // Q: Liên Châu Bạo Vũ
                    let count = 0;
                    const iv = setInterval(() => {
                        count++;
                        this.activeVFX.push({
                            type: 'arrow',
                            x: this.player.x,
                            y: this.player.y,
                            targetX: this.dummy.x + (Math.random() - 0.5) * 20,
                            targetY: this.dummy.y + (Math.random() - 0.5) * 20,
                            color: '#4caf6d',
                            damage: 15
                        });
                        if (count >= 5) clearInterval(iv);
                    }, 100);
                } else if (index === 1) {
                    // E: Phong Hỏa Liên Tiễn
                    this.activeVFX.push({
                        type: 'arc_arrow',
                        startX: this.player.x,
                        startY: this.player.y,
                        targetX: this.dummy.x,
                        targetY: this.dummy.y,
                        progress: 0,
                        color: '#ff7a45'
                    });
                } else if (index === 2) {
                    // R: Thiên Ngoại Phi Tiên
                    this.activeVFX.push({
                        type: 'skyfall_target',
                        x: this.dummy.x,
                        y: this.dummy.y,
                        timer: 500,
                        color: '#4caf6d'
                    });
                }
                break;

            case 'ZANGETSU':
                if (index === 0) {
                    // Q: Shunpo
                    audio.playShunpo();
                    this.activeVFX.push({
                        type: 'dash_trail',
                        x1: this.player.x,
                        y1: this.player.y,
                        x2: this.dummy.x - 40,
                        y2: this.dummy.y,
                        color: '#ff1744',
                        life: 1.0
                    });
                    this.damageDummy(35, '#ff1744', '⚡ SHUNPO -35');
                    this.addPopup(this.player.x, this.player.y - 30, '👥 TÀN ẢNH SHUNPO', '#ff1744');
                } else if (index === 1) {
                    // E: Bankai - Tensa Zangetsu
                    audio.playBankai();
                    this.activeVFX.push({
                        type: 'bankai_aura',
                        x: this.player.x,
                        y: this.player.y,
                        duration: 8000,
                        elapsed: 0,
                        color: '#ff1744'
                    });
                    this.addPopup(this.player.x, this.player.y - 30, '🗡️ BANKAI (+40% TỐC CHẠY)', '#ff1744');
                } else if (index === 2) {
                    // R: Mugetsu
                    audio.playMugetsu();
                    this.activeVFX.push({
                        type: 'getsuga_demo',
                        x: this.player.x,
                        y: this.player.y,
                        targetX: this.dummy.x + 100,
                        targetY: this.dummy.y,
                        color: '#000000',
                        damage: 120,
                        isMugetsu: true
                    });
                    this.damageDummy(120, '#ff1744', '🌑 MUGETSU -120!!');
                    this.addPopup(this.player.x, this.player.y - 30, '🩸 PHẢN PHỆ -30 HP', '#f44336');
                }
                break;

            case 'ONE_FOR_ALL':
                if (index === 0) {
                    // Q: Manchester Smash
                    audio.playSmash();
                    this.activeVFX.push({
                        type: 'smash_punch',
                        x: this.dummy.x,
                        y: this.dummy.y,
                        color: '#00e676',
                        life: 1.0,
                        radius: 65
                    });
                    this.dummy.shakeX = 18;
                    this.damageDummy(65, '#00e676', '💥 MANCHESTER SMASH -65!');
                } else if (index === 1) {
                    // E: Full Cowling
                    audio.playFullCowling();
                    this.activeVFX.push({
                        type: 'fullcowling_aura',
                        x: this.player.x,
                        y: this.player.y,
                        duration: 6000,
                        elapsed: 0,
                        color: '#00e676'
                    });
                    this.addPopup(this.player.x, this.player.y - 30, '⚡ FULL COWLING (+50% TỐC, +30% SÁT THƯƠNG)', '#00e676');
                } else if (index === 2) {
                    // R: United States of Smash
                    audio.playUnitedStates();
                    this.activeVFX.push({
                        type: 'smash_punch',
                        x: this.dummy.x,
                        y: this.dummy.y,
                        color: '#ffd700',
                        life: 1.5,
                        radius: 95
                    });
                    this.dummy.shakeX = 30;
                    this.dummy.shakeY = 20;
                    this.damageDummy(150, '#ffeb3b', '🇺🇸 UNITED STATES OF SMASH -150!!');
                    this.addPopup(this.player.x, this.player.y - 30, '💥 PHẢN PHỆ -50 HP', '#f44336');
                }
                break;

            case 'KATON':
                if (index === 0) {
                    // Q: Chidori
                    audio.playChidori();
                    this.activeVFX.push({
                        type: 'spear_thrust',
                        x1: this.player.x,
                        y1: this.player.y,
                        x2: this.dummy.x + 20,
                        y2: this.dummy.y,
                        color: '#00e5ff',
                        life: 1.0
                    });
                    this.damageDummy(70, '#00e5ff', '⚡ CHIDORI -70!');
                    this.addPopup(this.dummy.x, this.dummy.y - 45, '❄️ CHẬM 30% (1s)', '#00e5ff');
                } else if (index === 1) {
                    // E: Kamui
                    audio.playKamui();
                    this.activeVFX.push({
                        type: 'kamui_vortex',
                        x: this.dummy.x,
                        y: this.dummy.y,
                        duration: 1500,
                        elapsed: 0,
                        color: '#7c4dff'
                    });
                    setTimeout(() => {
                        if (this.active) {
                            this.damageDummy(40, '#7c4dff', '🌀 KAMUI -40!');
                            this.addPopup(this.dummy.x, this.dummy.y - 45, '💫 CHOÁNG 1s', '#ffd700');
                        }
                    }, 1500);
                } else if (index === 2) {
                    // R: Susano'o Hoàn Toàn Thể
                    audio.playSusanoo();
                    this.activeVFX.push({
                        type: 'susanoo_aura',
                        x: this.player.x,
                        y: this.player.y,
                        duration: 5000,
                        elapsed: 0,
                        color: '#2979ff'
                    });
                    this.addPopup(this.player.x, this.player.y - 30, '🛡️ SUSANO\'O (BẤT TỬ 5s, XUNG KÍCH 50)', '#2979ff');
                }
                break;

            case 'EXCALIBUR':
                if (index === 0) {
                    // Q: Strike Air
                    this.activeVFX.push({
                        type: 'heavy_slash',
                        x: (this.player.x + this.dummy.x) / 2,
                        y: this.player.y,
                        color: '#ffffff',
                        life: 1.0
                    });
                    this.dummy.shakeX = 20;
                    this.damageDummy(60, '#e0f7fa', '💨 STRIKE AIR -60 (ĐẨY LÙI 100px)');
                } else if (index === 1) {
                    // E: Avalon
                    audio.playHolyBarrier();
                    this.activeVFX.push({
                        type: 'avalon_barrier',
                        x: this.player.x,
                        y: this.player.y,
                        duration: 3000,
                        elapsed: 0,
                        color: '#ffd700'
                    });
                    this.addPopup(this.player.x, this.player.y - 30, '✨ AVALON (BẤT TỬ 3s & +50 HP)', '#ffd700');
                } else if (index === 2) {
                    // R: EXCALIBUR
                    audio.playExcalibur();
                    this.activeVFX.push({
                        type: 'excalibur_beam',
                        x1: this.player.x,
                        y1: this.player.y,
                        x2: this.dummy.x + 150,
                        y2: this.dummy.y,
                        life: 1.0,
                        color: '#ffd700'
                    });
                    this.dummy.shakeX = 25;
                    this.damageDummy(150, '#ffd700', '⚔️ EXCALIBUR -150!!');
                }
                break;

            case 'GATE_OF_BABYLON':
                if (index === 0) {
                    // Q: Triple Gate
                    audio.playBabylonGate();
                    for (let i = 0; i < 3; i++) {
                        setTimeout(() => {
                            if (this.active) {
                                this.activeVFX.push({
                                    type: 'babylon_shot',
                                    startX: this.player.x - 20,
                                    startY: this.player.y - 30 + i * 30,
                                    x: this.player.x - 20,
                                    y: this.player.y - 30 + i * 30,
                                    targetX: this.dummy.x,
                                    targetY: this.dummy.y,
                                    color: '#ffd700',
                                    damage: 40
                                });
                            }
                        }, i * 150);
                    }
                } else if (index === 1) {
                    // E: Chains of Heaven - Enkidu
                    audio.playEnkidu();
                    this.activeVFX.push({
                        type: 'enkidu_chains',
                        x: this.dummy.x,
                        y: this.dummy.y,
                        duration: 2000,
                        elapsed: 0,
                        color: '#ffd700'
                    });
                    this.damageDummy(25, '#ffd700', '⛓️ ENKIDU -25');
                    this.addPopup(this.dummy.x, this.dummy.y - 45, '⛓️ TRÓI CHÂN 2s', '#ffd700');
                } else if (index === 2) {
                    // R: ENUMA ELISH
                    audio.playEnumaElish();
                    this.activeVFX.push({
                        type: 'enuma_vortex',
                        x: this.dummy.x,
                        y: this.dummy.y,
                        duration: 3000,
                        elapsed: 0,
                        color: '#ff1744'
                    });
                    let tickCount = 0;
                    const enumaIv = setInterval(() => {
                        if (!this.active) {
                            clearInterval(enumaIv);
                            return;
                        }
                        tickCount++;
                        this.damageDummy(24, '#ff1744', '🌌 VÒNG XOÁY -24');
                        if (tickCount >= 5) {
                            clearInterval(enumaIv);
                            this.damageDummy(200, '#ffd700', '💥 KHAI THIÊN TÍCH ĐỊA -200!!');
                            this.dummy.shakeX = 30;
                        }
                    }, 500);
                }
                break;
        }
    }

    update(dt) {
        // Dummy shake decay
        this.dummy.shakeX *= 0.85;
        this.dummy.shakeY *= 0.85;
        if (this.dummy.hitFlash > 0) this.dummy.hitFlash -= dt;

        // Update Popups
        for (let i = this.popups.length - 1; i >= 0; i--) {
            const p = this.popups[i];
            p.y += p.vy;
            p.life -= 0.02;
            if (p.life <= 0) this.popups.splice(i, 1);
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.life -= pt.decay;
            if (pt.life <= 0) this.particles.splice(i, 1);
        }

        // Update VFX
        for (let i = this.activeVFX.length - 1; i >= 0; i--) {
            const v = this.activeVFX[i];

            if (v.type === 'slash' || v.type === 'heavy_slash' || v.type === 'spear_thrust' || v.type === 'dash_trail' || v.type === 'leap_slam' || v.type === 'ghost_spears') {
                v.life -= 0.05;
                if (v.life <= 0) this.activeVFX.splice(i, 1);
            } else if (v.type === 'sword_shield' || v.type === 'fire_ring' || v.type === 'tornado' || v.type === 'blood_aura' || v.type === 'hell_zone' || v.type === 'demon_form') {
                v.elapsed += dt;
                if (v.elapsed >= v.duration) this.activeVFX.splice(i, 1);
            } else if (v.type === 'arrow') {
                const dx = v.targetX - v.x;
                const dy = v.targetY - v.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 18) {
                    this.damageDummy(v.damage, v.color);
                    this.activeVFX.splice(i, 1);
                } else {
                    v.x += (dx / dist) * 16;
                    v.y += (dy / dist) * 16;
                }
            } else if (v.type === 'fan_projectile') {
                v.life -= 0.04;
                v.x += Math.cos(v.angle) * 10;
                v.y += Math.sin(v.angle) * 10;
                if (v.life <= 0) this.activeVFX.splice(i, 1);
            } else if (v.type === 'boomerang_demo') {
                v.progress += 0.035;
                if (v.progress >= 1.0) {
                    this.activeVFX.splice(i, 1);
                } else if (v.progress >= 0.48 && !v.hit) {
                    v.hit = true;
                    this.damageDummy(v.damage, v.color, `🪭 PHIẾN -${v.damage}`);
                }
            } else if (v.type === 'arc_arrow') {
                v.progress += 0.035;
                if (v.progress >= 1.0) {
                    this.damageDummy(45, v.color, '🔥 LIÊN TIỄN -45');
                    this.activeVFX.push({
                        type: 'fire_ring',
                        x: this.dummy.x,
                        y: this.dummy.y,
                        radius: 55,
                        duration: 3000,
                        elapsed: 0,
                        color: '#ff7a45'
                    });
                    this.activeVFX.splice(i, 1);
                }
            } else if (v.type === 'skyfall_target') {
                v.timer -= dt;
                if (v.timer <= 0) {
                    this.damageDummy(70, '#4caf6d', '⚡ THIÊN PHI TIÊN -70!');
                    this.activeVFX.push({
                        type: 'skyfall_bolt',
                        x: v.x,
                        y: v.y,
                        life: 1.0,
                        color: '#4caf6d'
                    });
                    this.activeVFX.splice(i, 1);
                }
            } else if (v.type === 'skyfall_bolt') {
                v.life -= 0.07;
                if (v.life <= 0) this.activeVFX.splice(i, 1);
            } else if (v.type === 'getsuga_demo') {
                const dx = v.targetX - v.x;
                const dy = v.targetY - v.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 20) {
                    this.damageDummy(v.damage, v.color, v.isMugetsu ? '🌑 MUGETSU' : '⚔️ GETSUGA TENSHOU');
                    this.activeVFX.splice(i, 1);
                } else {
                    v.x += (dx / dist) * 14;
                    v.y += (dy / dist) * 14;
                }
            } else if (v.type === 'kunai_projectile') {
                v.life -= 0.04;
                v.x += Math.cos(v.angle) * 12;
                v.y += Math.sin(v.angle) * 12;
                const dx = this.dummy.x - v.x;
                const dy = this.dummy.y - v.y;
                if (Math.hypot(dx, dy) < 22 && !v.hit) {
                    v.hit = true;
                    this.damageDummy(v.damage, v.color, `🥷 KUNAI -${v.damage}`);
                }
                if (v.life <= 0) this.activeVFX.splice(i, 1);
            } else if (v.type === 'babylon_shot') {
                const dx = v.targetX - v.x;
                const dy = v.targetY - v.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 18) {
                    this.damageDummy(v.damage, v.color, `✨ BẢO CỤ -${v.damage}`);
                    this.activeVFX.splice(i, 1);
                } else {
                    v.x += (dx / dist) * 18;
                    v.y += (dy / dist) * 18;
                }
            } else if (v.type === 'smash_punch' || v.type === 'excalibur_beam') {
                v.life -= 0.05;
                if (v.life <= 0) this.activeVFX.splice(i, 1);
            } else if (v.type === 'bankai_aura' || v.type === 'fullcowling_aura' || v.type === 'susanoo_aura' || v.type === 'avalon_barrier' || v.type === 'kamui_vortex' || v.type === 'enkidu_chains' || v.type === 'enuma_vortex') {
                v.elapsed += dt;
                if (v.elapsed >= v.duration) this.activeVFX.splice(i, 1);
            }
        }
    }

    draw() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Background grid / dojo floor
        ctx.fillStyle = '#141c17';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += 30) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += 30) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }

        // Arena boundary
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, this.canvas.width - 20, this.canvas.height - 20);

        // Draw ground persistent VFX (rings, zones)
        for (let i = 0; i < this.activeVFX.length; i++) {
            const v = this.activeVFX[i];
            if (v.type === 'fire_ring' || v.type === 'hell_zone') {
                ctx.save();
                ctx.fillStyle = v.type === 'hell_zone' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 122, 69, 0.2)';
                ctx.beginPath();
                ctx.arc(v.x, v.y, v.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = v.color;
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.restore();
            } else if (v.type === 'tornado') {
                ctx.save();
                ctx.strokeStyle = v.color;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(v.x, v.y, v.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            } else if (v.type === 'skyfall_target') {
                ctx.save();
                ctx.strokeStyle = '#ff5252';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.arc(v.x, v.y, 45, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = '#ff5252';
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('⚠ MỤC TIÊU!', v.x, v.y - 50);
                ctx.restore();
            }
        }

        // Draw Training Dummy (Mộc Nhân)
        ctx.save();
        const dx = this.dummy.x + this.dummy.shakeX;
        const dy = this.dummy.y + this.dummy.shakeY;

        ctx.shadowColor = this.dummy.hitFlash > 0 ? '#ff5252' : '#8d6e63';
        ctx.shadowBlur = this.dummy.hitFlash > 0 ? 18 : 6;

        ctx.fillStyle = this.dummy.hitFlash > 0 ? '#ffcdd2' : '#a1887f';
        ctx.beginPath();
        ctx.arc(dx, dy, this.dummy.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Wooden dummy arms & cross
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#4e342e';
        ctx.beginPath();
        ctx.moveTo(dx - 18, dy - 6);
        ctx.lineTo(dx + 18, dy - 6);
        ctx.stroke();

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('MỘC NHÂN', dx, dy + 32);
        ctx.restore();

        // Draw Player in Showcase
        ctx.save();
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 10;
        ctx.fillStyle = this.player.color;
        ctx.beginPath();
        ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Hands & Weapon direction
        const wdata = WEAPONS[this.selectedWeaponKey];
        ctx.strokeStyle = wdata ? wdata.color : '#ffd700';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.player.x, this.player.y);
        ctx.lineTo(this.player.x + 24, this.player.y);
        ctx.stroke();

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BẠN', this.player.x, this.player.y + 28);
        ctx.restore();

        // Draw Active VFX on top
        for (let i = 0; i < this.activeVFX.length; i++) {
            const v = this.activeVFX[i];
            if (v.type === 'slash') {
                ctx.save();
                ctx.strokeStyle = v.color;
                ctx.lineWidth = 4 * v.life;
                ctx.beginPath();
                ctx.arc(v.x, v.y, v.radius, v.angle - Math.PI / 3, v.angle + Math.PI / 3);
                ctx.stroke();
                ctx.restore();
            } else if (v.type === 'heavy_slash') {
                ctx.save();
                ctx.strokeStyle = v.color;
                ctx.lineWidth = 7 * v.life;
                ctx.beginPath();
                ctx.arc(v.x, v.y, 40, -Math.PI / 2, Math.PI / 2);
                ctx.stroke();
                ctx.restore();
            } else if (v.type === 'spear_thrust') {
                ctx.save();
                ctx.strokeStyle = v.color;
                ctx.lineWidth = 6 * v.life;
                ctx.beginPath();
                ctx.moveTo(v.x1, v.y1);
                ctx.lineTo(v.x2, v.y2);
                ctx.stroke();
                ctx.restore();
            } else if (v.type === 'dash_trail') {
                ctx.save();
                ctx.strokeStyle = v.color;
                ctx.lineWidth = 4 * v.life;
                ctx.setLineDash([8, 4]);
                ctx.beginPath();
                ctx.moveTo(v.x1, v.y1);
                ctx.lineTo(v.x2, v.y2);
                ctx.stroke();
                ctx.restore();
            } else if (v.type === 'arrow') {
                ctx.save();
                ctx.strokeStyle = v.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(v.x - 12, v.y);
                ctx.lineTo(v.x, v.y);
                ctx.stroke();
                ctx.restore();
            } else if (v.type === 'boomerang_demo') {
                ctx.save();
                const p = v.progress;
                const pp = p < 0.5 ? p / 0.5 : (1 - p) / 0.5;
                const curX = v.startX + (v.targetX - v.startX) * pp;
                const curY = v.startY + (v.targetY - v.startY) * pp;

                ctx.translate(curX, curY);
                ctx.rotate(p * 25);
                ctx.fillStyle = v.color;
                ctx.beginPath();
                ctx.moveTo(-12, 0);
                ctx.arc(0, 0, 12, Math.PI * 0.8, Math.PI * 2.2);
                ctx.fill();
                ctx.restore();
            } else if (v.type === 'arc_arrow') {
                ctx.save();
                const p = v.progress;
                const curX = v.startX + (v.targetX - v.startX) * p;
                const curY = v.startY + (v.targetY - v.startY) * p - Math.sin(p * Math.PI) * 70;
                ctx.fillStyle = v.color;
                ctx.beginPath();
                ctx.arc(curX, curY, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (v.type === 'skyfall_bolt') {
                ctx.save();
                ctx.strokeStyle = v.color;
                ctx.lineWidth = 8 * v.life;
                ctx.beginPath();
                ctx.moveTo(v.x, 0);
                ctx.lineTo(v.x, v.y);
                ctx.stroke();
                ctx.restore();
            } else if (v.type === 'sword_shield') {
                ctx.save();
                ctx.translate(v.x, v.y);
                ctx.rotate(v.elapsed * 0.005);
                ctx.strokeStyle = v.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, 36, 0, Math.PI * 2);
                ctx.stroke();
                for (let j = 0; j < 6; j++) {
                    const ang = (j / 6) * Math.PI * 2;
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(Math.cos(ang) * 36 - 2, Math.sin(ang) * 36 - 2, 4, 4);
                }
                ctx.restore();
            } else if (v.type === 'blood_aura' || v.type === 'demon_form') {
                ctx.save();
                ctx.strokeStyle = v.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(v.x, v.y, 32 + Math.sin(v.elapsed * 0.01) * 4, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            } else if (v.type === 'getsuga_demo') {
                ctx.save();
                ctx.strokeStyle = v.color;
                ctx.lineWidth = v.isMugetsu ? 12 : 6;
                ctx.shadowColor = v.color;
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(v.x, v.y, v.isMugetsu ? 45 : 28, -Math.PI / 2.5, Math.PI / 2.5);
                ctx.stroke();
                ctx.restore();
            } else if (v.type === 'smash_punch') {
                ctx.save();
                ctx.strokeStyle = v.color;
                ctx.lineWidth = 6 * v.life;
                ctx.shadowColor = v.color;
                ctx.shadowBlur = 18;
                ctx.beginPath();
                ctx.arc(v.x, v.y, (v.radius || 40) * (1.2 - v.life * 0.2), 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            } else if (v.type === 'kunai_projectile') {
                ctx.save();
                ctx.strokeStyle = v.color;
                ctx.fillStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(v.x, v.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            } else if (v.type === 'babylon_shot') {
                ctx.save();
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 4;
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 12;
                ctx.strokeRect(v.startX - 4, v.startY - 12, 8, 24);
                ctx.beginPath();
                ctx.moveTo(v.x - 16, v.y);
                ctx.lineTo(v.x, v.y);
                ctx.stroke();
                ctx.restore();
            } else if (v.type === 'excalibur_beam') {
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 235, 59, ' + v.life + ')';
                ctx.fillStyle = 'rgba(255, 255, 255, ' + (v.life * 0.8) + ')';
                ctx.lineWidth = 40 * v.life;
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 25;
                ctx.beginPath();
                ctx.moveTo(v.x1, v.y1);
                ctx.lineTo(v.x2, v.y2);
                ctx.stroke();
                ctx.restore();
            } else if (v.type === 'bankai_aura') {
                ctx.save();
                ctx.strokeStyle = '#ff1744';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#ff1744';
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.arc(v.x, v.y, 28 + Math.sin(v.elapsed * 0.015) * 5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            } else if (v.type === 'fullcowling_aura') {
                ctx.save();
                ctx.strokeStyle = '#00e676';
                ctx.lineWidth = 2;
                ctx.shadowColor = '#00e676';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(v.x, v.y, 26 + Math.sin(v.elapsed * 0.02) * 4, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            } else if (v.type === 'susanoo_aura') {
                ctx.save();
                ctx.strokeStyle = 'rgba(41, 121, 255, 0.8)';
                ctx.lineWidth = 5;
                ctx.shadowColor = '#2979ff';
                ctx.shadowBlur = 18;
                ctx.beginPath();
                ctx.arc(v.x, v.y, 38, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            } else if (v.type === 'avalon_barrier') {
                ctx.save();
                ctx.strokeStyle = '#ffd700';
                ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(v.x, v.y, 32, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            } else if (v.type === 'kamui_vortex') {
                ctx.save();
                ctx.strokeStyle = '#7c4dff';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#7c4dff';
                ctx.shadowBlur = 15;
                ctx.translate(v.x, v.y);
                ctx.rotate(v.elapsed * 0.008);
                ctx.beginPath();
                ctx.arc(0, 0, 30, 0, Math.PI * 1.5);
                ctx.stroke();
                ctx.restore();
            } else if (v.type === 'enkidu_chains') {
                ctx.save();
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 3;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(v.x - 22, v.y - 22, 44, 44);
                ctx.restore();
            } else if (v.type === 'enuma_vortex') {
                ctx.save();
                ctx.strokeStyle = '#ff1744';
                ctx.lineWidth = 4;
                ctx.shadowColor = '#ff1744';
                ctx.shadowBlur = 20;
                ctx.translate(v.x, v.y);
                ctx.rotate(-v.elapsed * 0.01);
                ctx.beginPath();
                ctx.arc(0, 0, 40, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        // Draw particles
        for (let i = 0; i < this.particles.length; i++) {
            const pt = this.particles[i];
            ctx.save();
            ctx.fillStyle = pt.color;
            ctx.globalAlpha = Math.max(0, pt.life);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Draw Popups (Damage Numbers / Buffs)
        for (let i = 0; i < this.popups.length; i++) {
            const p = this.popups[i];
            ctx.save();
            ctx.fillStyle = p.color;
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillText(p.text, p.x, p.y);
            ctx.restore();
        }
    }

    loop() {
        if (!this.active) return;
        const now = performance.now();
        const dt = now - this.lastTime;
        this.lastTime = now;

        this.update(dt);
        this.draw();

        this.animFrameId = requestAnimationFrame(() => this.loop());
    }
}
