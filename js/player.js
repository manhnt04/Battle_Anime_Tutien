import { CONSTANTS, clamp, distance, angleBetween, parsePixiColor } from './utils.js';
import { Inventory } from './weapon.js';

export class Player {
    constructor(x, y, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = CONSTANTS.PLAYER_RADIUS;
        // Player: Jade Cyan (#00e5ff), Enemies: Crimson / Amber / Purple
        this.color = isPlayer ? '#00e5ff' : '#ff5252';
        this.isPlayer = isPlayer;
        this.alive = true;
        this.health = 100;
        this.maxHealth = 100;
        this.armor = 0;
        this.maxArmor = 100;
        this.speed = isPlayer ? CONSTANTS.PLAYER_SPEED : CONSTANTS.ENEMY_SPEED;
        this.angle = 0;
        this.inventory = new Inventory();
        this.kills = 0;
        this.lastDamageTime = 0;
        this.stepTimer = 0;
        this.meleeAttacks = [];
        this.medicines = 2;
        this.maxMedicines = 5;

        // Martial skill cooldowns & buff states
        this.skillCooldowns = [0, 0, 0];
        this.buffs = {
            bladeShield: 0,
            bloodAura: 0,
            demonForm: 0,
            stun: 0,
            slow: 0,
            armorShred: 0,
            ccImmune: 0,
            // Anime Legendary buffs
            bankai: 0,
            mugetsu: 0,
            fullCowling: 0,
            susanoo: 0,
            susanooPulseTimer: 0,
            avalon: 0,
            rooted: 0
        };
    }

    getEffectiveSpeed() {
        if (this.buffs.stun > 0 || this.buffs.rooted > 0) return 0;
        const weapon = this.inventory ? this.inventory.getCurrentWeapon() : null;
        const mod = weapon && weapon.speedModifier ? weapon.speedModifier : 1.0;
        let finalSpeed = this.speed * mod;
        if (this.buffs.bankai > 0) finalSpeed *= 1.4;
        if (this.buffs.fullCowling > 0) finalSpeed *= 1.5;
        if (this.buffs.slow > 0) finalSpeed *= (1 - (this.buffs.slowPct || 0.2));
        return finalSpeed;
    }

    canUseSkill(index) {
        if (!this.alive || this.buffs.stun > 0) return false;
        const weapon = this.inventory ? this.inventory.getCurrentWeapon() : null;
        if (!weapon || !weapon.skills || !weapon.skills[index]) return false;
        return (this.skillCooldowns[index] || 0) <= 0;
    }

    useSkill(index, targetPoint, game) {
        if (!this.canUseSkill(index)) return null;
        const weapon = this.inventory.getCurrentWeapon();
        const skill = weapon.skills[index];
        this.skillCooldowns[index] = skill.cd;
        return weapon.useSkill(index, this, targetPoint, game);
    }

    applyStun(duration) {
        if (this.buffs.demonForm > 0 || this.buffs.ccImmune > 0) return;
        this.buffs.stun = Math.max(this.buffs.stun, duration);
    }

    applySlow(pct, duration) {
        if (this.buffs.demonForm > 0 || this.buffs.ccImmune > 0) return;
        this.buffs.slow = Math.max(this.buffs.slow, duration);
        this.buffs.slowPct = pct !== undefined ? pct : 0.2;
    }

    applyArmorShred(pct, duration) {
        this.buffs.armorShred = Math.max(this.buffs.armorShred, duration);
        this.buffs.armorShredPct = pct !== undefined ? pct : 0.3;
    }

    update(input, map, dt) {
        if (!this.alive) return;

        // Decrement active skill cooldowns
        for (let i = 0; i < this.skillCooldowns.length; i++) {
            if (this.skillCooldowns[i] > 0) {
                this.skillCooldowns[i] = Math.max(0, this.skillCooldowns[i] - dt);
            }
        }

        // Decrement buffs & debuffs
        if (this.buffs.bladeShield > 0) this.buffs.bladeShield = Math.max(0, this.buffs.bladeShield - dt);
        if (this.buffs.bloodAura > 0) this.buffs.bloodAura = Math.max(0, this.buffs.bloodAura - dt);
        if (this.buffs.demonForm > 0) this.buffs.demonForm = Math.max(0, this.buffs.demonForm - dt);
        if (this.buffs.slow > 0) this.buffs.slow = Math.max(0, this.buffs.slow - dt);
        if (this.buffs.armorShred > 0) this.buffs.armorShred = Math.max(0, this.buffs.armorShred - dt);
        if (this.buffs.ccImmune > 0) this.buffs.ccImmune = Math.max(0, this.buffs.ccImmune - dt);

        // Anime Legendary Buffs Decrement
        if (this.buffs.bankai > 0) this.buffs.bankai = Math.max(0, this.buffs.bankai - dt);
        if (this.buffs.fullCowling > 0) this.buffs.fullCowling = Math.max(0, this.buffs.fullCowling - dt);
        if (this.buffs.avalon > 0) this.buffs.avalon = Math.max(0, this.buffs.avalon - dt);
        if (this.buffs.rooted > 0) this.buffs.rooted = Math.max(0, this.buffs.rooted - dt);

        // Mugetsu expiration handling: deals 30 recoil damage upon ending
        if (this.buffs.mugetsu > 0) {
            this.buffs.mugetsu -= dt;
            if (this.buffs.mugetsu <= 0) {
                this.buffs.mugetsu = 0;
                const recoil = Math.min(30, Math.max(0, this.health - 1));
                if (recoil > 0) this.takeDamage(recoil);
            }
        }

        // Susano'o: damage immunity and periodic pulse timer
        if (this.buffs.susanoo > 0) {
            this.buffs.susanoo = Math.max(0, this.buffs.susanoo - dt);
            this.buffs.susanooPulseTimer = (this.buffs.susanooPulseTimer || 0) + dt;
            if (this.buffs.susanooPulseTimer >= 2000) {
                this.buffs.susanooPulseTimer = 0;
                this.susanooPulseReady = true;
            }
        }

        if (this.buffs.stun > 0) {
            this.buffs.stun = Math.max(0, this.buffs.stun - dt);
            return;
        }

        // Movement
        let ax = 0, ay = 0;
        if (this.isPlayer && input) {
            if (input.keys['w'] || input.keys['arrowup']) ay -= 1;
            if (input.keys['s'] || input.keys['arrowdown']) ay += 1;
            if (input.keys['a'] || input.keys['arrowleft']) ax -= 1;
            if (input.keys['d'] || input.keys['arrowright']) ax += 1;

            // Virtual Joystick support (Mobile)
            if (input.joystick && input.joystick.active) {
                ax += input.joystick.x;
                ay += input.joystick.y;
                if ((input.mouse.x === null || !input.mouse.down) && (Math.abs(input.joystick.x) > 0.1 || Math.abs(input.joystick.y) > 0.1)) {
                    this.angle = Math.atan2(input.joystick.y, input.joystick.x);
                }
            }

        }

        // Normalize diagonal movement
        if (ax !== 0 || ay !== 0) {
            const len = Math.sqrt(ax * ax + ay * ay);
            ax /= len;
            ay /= len;
            if (this.isPlayer) this.angle = Math.atan2(ay, ax);
        }

        const effectiveSpeed = this.getEffectiveSpeed();
        this.vx += ax * effectiveSpeed;
        this.vy += ay * effectiveSpeed;
        this.vx *= CONSTANTS.FRICTION;
        this.vy *= CONSTANTS.FRICTION;

        // Resolve collision with terrain
        const newPos = map.resolveCollision(this.x, this.y, this.radius, this.vx, this.vy);
        this.x = newPos.x;
        this.y = newPos.y;

        // Footsteps
        if (this.isPlayer && (Math.abs(this.vx) > 0.4 || Math.abs(this.vy) > 0.4)) {
            this.stepTimer += dt;
            if (this.stepTimer > 320) {
                this.stepTimer = 0;
            }
        }

        // Update melee attacks
        for (let i = this.meleeAttacks.length - 1; i >= 0; i--) {
            this.meleeAttacks[i].update();
            if (!this.meleeAttacks[i].alive) {
                this.meleeAttacks.splice(i, 1);
            }
        }

        // Clamp to map
        this.x = clamp(this.x, this.radius, map.width - this.radius);
        this.y = clamp(this.y, this.radius, map.height - this.radius);
    }

    takeDamage(amount) {
        if (!this.alive) return 0;
        // Avalon (Excalibur) and Susano'o (Katon) complete damage immunity
        if (this.buffs.avalon > 0 || this.buffs.susanoo > 0) return 0;

        this.lastDamageTime = Date.now();

        // Kiếm Khí Hộ Thể reduces 30% damage
        let incoming = amount;
        if (this.buffs.bladeShield > 0) {
            incoming *= 0.7;
        }
        // Armor shred increases 30% damage
        if (this.buffs.armorShred > 0) {
            incoming *= 1.3;
        }

        // Hộ Thể Giáp absorbs 50% damage
        let actualDamage = incoming;
        if (this.armor > 0) {
            const armorAbsorb = Math.min(this.armor, incoming * 0.5);
            this.armor -= armorAbsorb;
            actualDamage -= armorAbsorb;
        }

        this.health -= actualDamage;
        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
        }
        return actualDamage;
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    addArmor(amount) {
        this.armor = Math.min(this.maxArmor, this.armor + amount);
    }

    draw(ctx, camera) {
        if (!this.alive) return;

        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        ctx.save();

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(sx, sy + this.radius - 2, this.radius * 0.85, this.radius * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Martial Artist Body (Áo bào kiếm khách)
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.isPlayer ? 16 : 8;
        ctx.beginPath();
        ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner golden / white martial aura
        ctx.fillStyle = this.armor > 0 ? 'rgba(255, 215, 0, 0.35)' : 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.arc(sx - 4, sy - 4, this.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Belt / Sash (Thắt lưng hiệp khách)
        ctx.fillStyle = '#212121';
        ctx.beginPath();
        ctx.arc(sx, sy, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Direction / Martial Stance indicator
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(this.angle) * this.radius * 0.4, sy + Math.sin(this.angle) * this.radius * 0.4);
        ctx.lineTo(sx + Math.cos(this.angle) * (this.radius + 9), sy + Math.sin(this.angle) * (this.radius + 9));
        ctx.stroke();

        // Weapon in hand indicator
        const weapon = this.inventory.getCurrentWeapon();
        if (weapon) {
            ctx.fillStyle = weapon.color;
            ctx.shadowColor = weapon.color;
            ctx.shadowBlur = 6;
            const wx = sx + Math.cos(this.angle) * (this.radius + 12);
            const wy = sy + Math.sin(this.angle) * (this.radius + 12);
            ctx.beginPath();
            ctx.arc(wx, wy, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Enemy Health Bar
        if (!this.isPlayer) {
            const barWidth = 32;
            const barHeight = 4;
            const barX = sx - barWidth / 2;
            const barY = sy - this.radius - 12;

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // Health bar fill
            const healthPct = this.health / this.maxHealth;
            ctx.fillStyle = healthPct > 0.5 ? '#00e676' : healthPct > 0.25 ? '#ffd600' : '#ff1744';
            ctx.fillRect(barX, barY, barWidth * healthPct, barHeight);

            // Armor bar mini pip
            if (this.armor > 0) {
                ctx.fillStyle = '#ffd700';
                ctx.fillRect(barX, barY - 2, barWidth * (this.armor / this.maxArmor), 2);
            }
        }

        // Buff / Status Auras
        if (this.buffs.bladeShield > 0) {
            ctx.save();
            ctx.strokeStyle = '#4aa8ff';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#4aa8ff';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 16, 0, Math.PI * 2);
            ctx.stroke();

            const n = 6, rot = Date.now() * 0.005;
            for (let i = 0; i < n; i++) {
                const ang = rot + i * (Math.PI * 2 / n);
                const bx = sx + Math.cos(ang) * (this.radius + 16);
                const by = sy + Math.sin(ang) * (this.radius + 16);
                ctx.save();
                ctx.translate(bx, by);
                ctx.rotate(ang + Math.PI / 2);
                ctx.fillStyle = '#4aa8ff';
                ctx.fillRect(-2, -8, 4, 16);
                ctx.restore();
            }
            ctx.restore();
        }

        if (this.buffs.bloodAura > 0) {
            ctx.save();
            const pulse = 0.5 + 0.3 * Math.sin(Date.now() * 0.008);
            ctx.fillStyle = `rgba(255, 46, 46, ${0.15 * pulse})`;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 18, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#ffd24a';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#ff2e2e';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        if (this.buffs.demonForm > 0) {
            ctx.save();
            const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.01);
            ctx.fillStyle = `rgba(139, 92, 246, ${0.18 * pulse})`;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 24, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#c9a24b';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#8b5cf6';
            ctx.shadowBlur = 26;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 16, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        if (this.buffs.stun > 0) {
            ctx.save();
            ctx.fillStyle = '#ffd700';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            const starRot = Date.now() * 0.008;
            const starX = sx + Math.cos(starRot) * 12;
            const starY = sy - this.radius - 18 + Math.sin(starRot) * 4;
            ctx.fillText('💫', starX, starY);
            ctx.restore();
        }

        if (this.buffs.slow > 0) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        if (this.buffs.bankai > 0) {
            ctx.save();
            const pulse = 0.6 + 0.3 * Math.sin(Date.now() * 0.012);
            ctx.strokeStyle = '#ff1744';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#ff1744';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 14 * pulse, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#111111';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        if (this.buffs.mugetsu > 0) {
            ctx.save();
            const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.015);
            ctx.fillStyle = `rgba(18, 0, 30, ${0.4 * pulse})`;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 25, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#d500f9';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#d500f9';
            ctx.shadowBlur = 24;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 20, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        if (this.buffs.fullCowling > 0) {
            ctx.save();
            ctx.strokeStyle = '#00e5ff';
            ctx.shadowColor = '#69f0ae';
            ctx.shadowBlur = 16;
            ctx.lineWidth = 2.5;
            const t = Date.now() * 0.01;
            for (let i = 0; i < 4; i++) {
                const a = t + i * (Math.PI / 2);
                const r1 = this.radius + 6;
                const r2 = this.radius + 16;
                const midX = sx + Math.cos(a) * (r1 + 4) + (Math.random() - 0.5) * 6;
                const midY = sy + Math.sin(a) * (r1 + 4) + (Math.random() - 0.5) * 6;
                ctx.beginPath();
                ctx.moveTo(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1);
                ctx.lineTo(midX, midY);
                ctx.lineTo(sx + Math.cos(a + 0.3) * r2, sy + Math.sin(a + 0.3) * r2);
                ctx.stroke();
            }
            ctx.restore();
        }

        if (this.buffs.susanoo > 0) {
            ctx.save();
            const pulse = 0.6 + 0.2 * Math.sin(Date.now() * 0.008);
            ctx.strokeStyle = 'rgba(0, 176, 255, 0.85)';
            ctx.fillStyle = `rgba(0, 176, 255, ${0.12 * pulse})`;
            ctx.lineWidth = 4;
            ctx.shadowColor = '#00b0ff';
            ctx.shadowBlur = 26;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 32, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        if (this.buffs.avalon > 0) {
            ctx.save();
            const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.01);
            ctx.strokeStyle = '#ffd700';
            ctx.fillStyle = `rgba(255, 215, 0, ${0.15 * pulse})`;
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 28;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        if (this.buffs.rooted > 0) {
            ctx.save();
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(sx, sy + this.radius - 2, this.radius + 6, (this.radius + 6) * 0.45, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();

        // Draw active melee attacks
        for (const attack of this.meleeAttacks) {
            attack.draw(ctx, camera);
        }
    }

    initPixi(parentContainer) {
        if (typeof window === 'undefined' || !window.PIXI) return;
        this.destroyPixi();

        this.view = new window.PIXI.Container();
        this.view.position.set(this.x, this.y);

        this.gShadow = new window.PIXI.Graphics();
        this.gBody = new window.PIXI.Graphics();
        this.gAim = new window.PIXI.Graphics();
        this.gAuras = new window.PIXI.Graphics();
        this.gMelee = new window.PIXI.Graphics();

        this.view.addChild(this.gShadow);
        this.view.addChild(this.gBody);
        this.view.addChild(this.gAim);
        this.view.addChild(this.gAuras);
        this.view.addChild(this.gMelee);

        if (!this.isPlayer) {
            this.gHpBar = new window.PIXI.Graphics();
            this.view.addChild(this.gHpBar);
        }

        if (parentContainer) {
            parentContainer.addChild(this.view);
            this.parentContainer = parentContainer;
        }

        this.updatePixiGraphics();
    }

    destroyPixi() {
        if (this.view) {
            if (this.parentContainer) {
                this.parentContainer.removeChild(this.view);
            }
            this.view.destroy({ children: true });
            this.view = null;
            this.parentContainer = null;
        }
    }

    updatePixiView(inLOS = true) {
        if (!this.view) return;
        if (!this.alive || !inLOS) {
            this.view.visible = false;
            return;
        }
        this.view.visible = true;
        this.view.position.set(this.x, this.y);

        this.updatePixiGraphics();
    }

    updatePixiGraphics() {
        if (!this.view) return;

        // Shadow
        this.gShadow.clear();
        this.gShadow.ellipse(0, this.radius - 2, this.radius * 0.85, this.radius * 0.35)
                    .fill({ color: 0x000000, alpha: 0.35 });

        // Martial Artist Body
        this.gBody.clear();
        const bodyCol = parsePixiColor(this.color).color;
        this.gBody.circle(0, 0, this.radius).fill({ color: bodyCol, alpha: 1 });

        // Inner golden / white martial aura
        const innerCol = this.armor > 0 ? 0xffd700 : 0xffffff;
        const innerAlpha = this.armor > 0 ? 0.35 : 0.2;
        this.gBody.circle(-4, -4, this.radius * 0.45).fill({ color: innerCol, alpha: innerAlpha });

        // Belt / Sash
        this.gBody.circle(0, 0, this.radius * 0.3).fill({ color: 0x212121, alpha: 1 });

        // Direction & Weapon
        this.gAim.clear();
        const cosA = Math.cos(this.angle);
        const sinA = Math.sin(this.angle);
        this.gAim.moveTo(cosA * this.radius * 0.4, sinA * this.radius * 0.4)
                 .lineTo(cosA * (this.radius + 9), sinA * (this.radius + 9))
                 .stroke({ color: 0xffffff, width: 3, alpha: 0.85 });

        const weapon = this.inventory ? this.inventory.getCurrentWeapon() : null;
        if (weapon) {
            const wCol = parsePixiColor(weapon.color || '#4aa8ff').color;
            this.gAim.circle(cosA * (this.radius + 12), sinA * (this.radius + 12), 4)
                     .fill({ color: wCol, alpha: 1 });
        }

        // Enemy Health Bar
        if (!this.isPlayer && this.gHpBar) {
            this.gHpBar.clear();
            const barW = 32;
            const barH = 4;
            const barX = -barW / 2;
            const barY = -this.radius - 12;

            this.gHpBar.rect(barX, barY, barW, barH).fill({ color: 0x000000, alpha: 0.6 });

            const pct = clamp(this.health / this.maxHealth, 0, 1);
            const hpColor = pct > 0.5 ? 0x00e676 : pct > 0.25 ? 0xffd600 : 0xff1744;
            this.gHpBar.rect(barX, barY, barW * pct, barH).fill({ color: hpColor, alpha: 1 });

            if (this.armor > 0) {
                const armorPct = clamp(this.armor / this.maxArmor, 0, 1);
                this.gHpBar.rect(barX, barY - 2, barW * armorPct, 2).fill({ color: 0xffd700, alpha: 1 });
            }
        }

        // Buff / Status Auras
        this.gAuras.clear();
        if (this.buffs.bladeShield > 0) {
            this.gAuras.circle(0, 0, this.radius + 16).stroke({ color: 0x4aa8ff, width: 2, alpha: 0.85 });
            const n = 6, rot = Date.now() * 0.005;
            for (let i = 0; i < n; i++) {
                const ang = rot + i * (Math.PI * 2 / n);
                const bx = Math.cos(ang) * (this.radius + 16);
                const by = Math.sin(ang) * (this.radius + 16);
                this.gAuras.circle(bx, by, 3).fill({ color: 0x4aa8ff, alpha: 0.9 });
            }
        }

        if (this.buffs.bloodAura > 0) {
            const pulse = 0.5 + 0.3 * Math.sin(Date.now() * 0.008);
            this.gAuras.circle(0, 0, this.radius + 18).fill({ color: 0xff2e2e, alpha: 0.15 * pulse });
            this.gAuras.circle(0, 0, this.radius + 12).stroke({ color: 0xffd24a, width: 2.5, alpha: 0.9 });
        }

        if (this.buffs.demonForm > 0) {
            const dpulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.01);
            this.gAuras.circle(0, 0, this.radius + 24).fill({ color: 0x8b5cf6, alpha: 0.18 * dpulse });
            this.gAuras.circle(0, 0, this.radius + 16).stroke({ color: 0xc9a24b, width: 2.5, alpha: 0.9 });
        }

        if (this.buffs.stun > 0) {
            const starRot = Date.now() * 0.008;
            for (let s = 0; s < 3; s++) {
                const sa = starRot + s * (Math.PI * 2 / 3);
                this.gAuras.circle(Math.cos(sa) * 14, -this.radius - 12 + Math.sin(sa) * 4, 3)
                           .fill({ color: 0xffd700, alpha: 0.95 });
            }
        }

        if (this.buffs.slow > 0) {
            this.gAuras.circle(0, 0, this.radius + 6).stroke({ color: 0x00e5ff, width: 2, alpha: 0.6 });
        }

        if (this.buffs.bankai > 0) {
            const pulse = 0.6 + 0.3 * Math.sin(Date.now() * 0.012);
            this.gAuras.circle(0, 0, this.radius + 14 * pulse).stroke({ color: 0xff1744, width: 3, alpha: 0.9 });
            this.gAuras.circle(0, 0, this.radius + 8).stroke({ color: 0x111111, width: 2, alpha: 0.8 });
        }

        if (this.buffs.mugetsu > 0) {
            const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.015);
            this.gAuras.circle(0, 0, this.radius + 25).fill({ color: 0x12001e, alpha: 0.35 * pulse });
            this.gAuras.circle(0, 0, this.radius + 20).stroke({ color: 0xd500f9, width: 3, alpha: 0.9 });
        }

        if (this.buffs.fullCowling > 0) {
            const t = Date.now() * 0.01;
            for (let i = 0; i < 4; i++) {
                const a = t + i * (Math.PI / 2);
                const r1 = this.radius + 6;
                const r2 = this.radius + 16;
                const midX = Math.cos(a) * (r1 + 4) + (Math.random() - 0.5) * 6;
                const midY = Math.sin(a) * (r1 + 4) + (Math.random() - 0.5) * 6;
                this.gAuras.moveTo(Math.cos(a) * r1, Math.sin(a) * r1)
                           .lineTo(midX, midY)
                           .lineTo(Math.cos(a + 0.3) * r2, Math.sin(a + 0.3) * r2)
                           .stroke({ color: 0x00e5ff, width: 2.5, alpha: 0.85 });
            }
        }

        if (this.buffs.susanoo > 0) {
            const pulse = 0.6 + 0.2 * Math.sin(Date.now() * 0.008);
            this.gAuras.circle(0, 0, this.radius + 32).fill({ color: 0x00b0ff, alpha: 0.12 * pulse });
            this.gAuras.circle(0, 0, this.radius + 32).stroke({ color: 0x00b0ff, width: 4, alpha: 0.85 });
        }

        if (this.buffs.avalon > 0) {
            const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.01);
            this.gAuras.circle(0, 0, this.radius + 18).fill({ color: 0xffd700, alpha: 0.15 * pulse });
            this.gAuras.circle(0, 0, this.radius + 18).stroke({ color: 0xffd700, width: 3.5, alpha: 0.9 });
        }

        if (this.buffs.rooted > 0) {
            this.gAuras.ellipse(0, this.radius - 2, this.radius + 6, (this.radius + 6) * 0.45)
                       .stroke({ color: 0xffd700, width: 3, alpha: 0.9 });
        }

        // Active Melee Attacks
        this.gMelee.clear();
        for (const attack of this.meleeAttacks) {
            if (typeof attack.drawPixi === 'function') {
                attack.drawPixi(this.gMelee, this.x, this.y);
            }
        }
    }
}
