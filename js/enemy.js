import { Player } from './player.js';
import { CONSTANTS, distance, angleBetween, randomRange, randomInt, clamp } from './utils.js';
import { Weapon, MeleeAttack } from './weapon.js';

export class Enemy extends Player {
    constructor(x, y, type = 'basic') {
        super(x, y, false);
        this.type = type;
        this.colors = {
            basic: '#ff5252',        // Tân thủ giang hồ
            aggressive: '#d50000',   // Ma giáo cuồng đồ
            cautious: '#ff9100',     // Danh môn chính phái
            sniper: '#ab47bc'        // Tuyệt đỉnh cao thủ
        };
        this.color = this.colors[type] || this.colors.basic;

        // AI state
        this.state = 'wander';
        this.target = null;
        this.wanderAngle = randomRange(0, Math.PI * 2);
        this.wanderTimer = 0;
        this.stateTimer = 0;
        this.detectionRange = type === 'sniper' ? 520 : 320;
        this.attackRange = type === 'sniper' ? 620 : type === 'aggressive' ? 160 : 260;
        this.preferredRange = this.attackRange;
        this.lastAttackTime = 0;
        this.strafeDir = Math.random() > 0.5 ? 1 : -1;
        this.strafeTimer = 0;
        this.lootTarget = null;
        this.airdropTarget = null;
        this.thinkInterval = 100;
        this.thinkTimer = randomRange(0, this.thinkInterval);

        // Stuck detection & anti-barrier logic
        this.lastPosX = x;
        this.lastPosY = y;
        this.stuckTimer = 0;

        // Random Wuxia starting weapon
        const wuxiaWeapons = [
            'TRUONG_KIEM',
            'THIET_PHIEN',
            'LONG_UYET_DAO',
            'MA_THIEN_THUONG',
            'BACH_HOP_CUNG'
        ];
        const chosenWeapon = wuxiaWeapons[randomInt(0, wuxiaWeapons.length - 1)];
        this.inventory.addWeapon(chosenWeapon);
        this.inventory.switchToSlot(1);
    }

    updateAI(player, enemies, map, lootManager, safeZone, dt, airdrops = []) {
        if (!this.alive) return;

        this.stateTimer += dt;
        this.wanderTimer += dt;
        this.strafeTimer += dt;
        this.thinkTimer += dt;
        const shouldThink = this.thinkTimer >= this.thinkInterval;
        if (shouldThink) this.thinkTimer %= this.thinkInterval;

        // Check if stuck against wall/rock
        const movedDist = distance(this.x, this.y, this.lastPosX, this.lastPosY);
        if (movedDist < 0.25) {
            this.stuckTimer += dt;
            if (this.stuckTimer > 280) {
                // Deflect angle around obstacle
                this.wanderAngle += (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 2 + randomRange(0.2, 0.5));
                this.stuckTimer = 0;
            }
        } else {
            this.stuckTimer = Math.max(0, this.stuckTimer - dt * 2);
        }
        this.lastPosX = this.x;
        this.lastPosY = this.y;

        // Check poison miasma zone (Độc Vụ)
        const distToZone = distance(this.x, this.y, safeZone.x, safeZone.y);
        const inZone = distToZone < safeZone.radius;

        if (!inZone && this.health < 60) {
            this.state = 'flee_zone';
        }

        // Contest Airdrops (Tranh đoạt Kỳ Bảo)
        if (shouldThink && airdrops && airdrops.length > 0 && this.state !== 'flee_zone') {
            for (let i = 0; i < airdrops.length; i++) {
                const drop = airdrops[i];
                if (!drop.looted && !drop.falling && distance(this.x, this.y, drop.x, drop.y) < 380) {
                    this.airdropTarget = drop;
                    this.state = 'contest_airdrop';
                    break;
                }
            }
        }

        // State machine
        switch (this.state) {
            case 'wander':
                this.doWander(map, dt);
                if (shouldThink) this.scanForTargets(player, enemies, lootManager, map);
                break;

            case 'chase':
                if (!this.target || !this.target.alive) {
                    this.state = 'wander';
                    this.target = null;
                    break;
                }
                if (!map.hasLineOfSight(this.x, this.y, this.target.x, this.target.y) && distance(this.x, this.y, this.target.x, this.target.y) > 140) {
                    if (this.stateTimer > 2500) {
                        this.state = 'wander';
                        this.target = null;
                        break;
                    }
                }
                this.doChase(map, dt);
                if (this.shouldAttack()) {
                    this.state = 'attack';
                }
                if (this.health < 30 && this.type !== 'aggressive') {
                    this.state = 'retreat';
                }
                break;

            case 'attack':
                if (!this.target || !this.target.alive) {
                    this.state = 'wander';
                    break;
                }
                this.doAttack(map, dt);
                const dist = distance(this.x, this.y, this.target.x, this.target.y);
                if (dist > this.attackRange * 1.5) {
                    this.state = 'chase';
                }
                if (this.health < 25 && this.type !== 'aggressive') {
                    this.state = 'retreat';
                }
                break;

            case 'retreat':
                if (!this.target || !this.target.alive) {
                    this.state = 'wander';
                    break;
                }
                this.doRetreat(map, dt);
                if (this.health > 60 || distance(this.x, this.y, this.target.x, this.target.y) > 420) {
                    this.state = 'wander';
                }
                break;

            case 'contest_airdrop':
                if (!this.airdropTarget || this.airdropTarget.looted) {
                    this.state = 'wander';
                    this.airdropTarget = null;
                    break;
                }
                this.doMoveTowards(this.airdropTarget.x, this.airdropTarget.y, map, dt);
                if (shouldThink) this.scanForTargets(player, enemies, lootManager, map);
                break;

            case 'loot':
                if (!this.lootTarget || !this.lootTarget.alive) {
                    this.state = 'wander';
                    this.lootTarget = null;
                    break;
                }
                this.doLoot(map, dt);
                break;

            case 'flee_zone':
                this.doFleeZone(safeZone, map, dt);
                if (inZone) {
                    this.state = 'wander';
                }
                break;
        }

        // Weapon upkeep
        const weapon = this.inventory.getCurrentWeapon();
        if (weapon) {
            weapon.update();
            if (weapon.type === 'ranged' && weapon.currentAmmo === 0 && !weapon.reloading) {
                if (this.inventory.canReload()) {
                    this.inventory.reload();
                } else {
                    this.inventory.switchToSlot(0); // Switch to Fists
                }
            }
        }

        // Update melee attacks
        for (let i = this.meleeAttacks.length - 1; i >= 0; i--) {
            this.meleeAttacks[i].update();
            if (!this.meleeAttacks[i].alive) {
                this.meleeAttacks.splice(i, 1);
            }
        }
    }

    doWander(map, dt) {
        if (this.wanderTimer > 2000) {
            this.wanderAngle += randomRange(-Math.PI / 2, Math.PI / 2);
            this.wanderTimer = 0;
        }

        const spd = this.getEffectiveSpeed();
        this.vx += Math.cos(this.wanderAngle) * spd * 0.5;
        this.vy += Math.sin(this.wanderAngle) * spd * 0.5;
        this.vx *= CONSTANTS.FRICTION;
        this.vy *= CONSTANTS.FRICTION;

        const newPos = map.resolveCollision(this.x, this.y, this.radius, this.vx, this.vy);
        this.x = newPos.x;
        this.y = newPos.y;
        this.angle = this.wanderAngle;
    }

    doChase(map, dt) {
        if (!this.target) return;
        const angle = angleBetween(this.x, this.y, this.target.x, this.target.y);
        this.angle = angle;

        let moveAngle = angle;
        if (this.strafeTimer > 1500) {
            this.strafeDir *= -1;
            this.strafeTimer = 0;
        }
        if (this.strafeTimer < 800 && this.type !== 'aggressive') {
            moveAngle += this.strafeDir * Math.PI / 3;
        }

        const spd = this.getEffectiveSpeed();
        this.vx += Math.cos(moveAngle) * spd;
        this.vy += Math.sin(moveAngle) * spd;
        this.vx *= CONSTANTS.FRICTION;
        this.vy *= CONSTANTS.FRICTION;

        const newPos = map.resolveCollision(this.x, this.y, this.radius, this.vx, this.vy);
        this.x = newPos.x;
        this.y = newPos.y;
    }

    doAttack(map, dt) {
        if (!this.target) return;
        const angle = angleBetween(this.x, this.y, this.target.x, this.target.y);
        this.angle = angle;

        const dist = distance(this.x, this.y, this.target.x, this.target.y);
        const weapon = this.inventory.getCurrentWeapon();
        const spd = this.getEffectiveSpeed();

        if (weapon && weapon.type === 'ranged' && dist < this.preferredRange * 0.5) {
            this.vx -= Math.cos(angle) * spd * 0.5;
            this.vy -= Math.sin(angle) * spd * 0.5;
        } else if (weapon && weapon.type === 'melee' && dist > 45) {
            this.vx += Math.cos(angle) * spd;
            this.vy += Math.sin(angle) * spd;
        }

        this.vx *= CONSTANTS.FRICTION;
        this.vy *= CONSTANTS.FRICTION;

        const newPos = map.resolveCollision(this.x, this.y, this.radius, this.vx, this.vy);
        this.x = newPos.x;
        this.y = newPos.y;

        // Strict LOS check before firing: do not fire into walls
        if (map.hasLineOfSight(this.x, this.y, this.target.x, this.target.y)) {
            this.tryFire();
        }
    }

    doRetreat(map, dt) {
        if (!this.target) return;
        const angle = angleBetween(this.x, this.y, this.target.x, this.target.y);
        this.angle = angle + Math.PI;

        const spd = this.getEffectiveSpeed();
        this.vx -= Math.cos(angle) * spd * 0.8;
        this.vy -= Math.sin(angle) * spd * 0.8;
        this.vx *= CONSTANTS.FRICTION;
        this.vy *= CONSTANTS.FRICTION;

        const newPos = map.resolveCollision(this.x, this.y, this.radius, this.vx, this.vy);
        this.x = newPos.x;
        this.y = newPos.y;
    }

    doMoveTowards(tx, ty, map, dt) {
        const angle = angleBetween(this.x, this.y, tx, ty);
        this.angle = angle;

        const spd = this.getEffectiveSpeed();
        this.vx += Math.cos(angle) * spd;
        this.vy += Math.sin(angle) * spd;
        this.vx *= CONSTANTS.FRICTION;
        this.vy *= CONSTANTS.FRICTION;

        const newPos = map.resolveCollision(this.x, this.y, this.radius, this.vx, this.vy);
        this.x = newPos.x;
        this.y = newPos.y;
    }

    doLoot(map, dt) {
        if (!this.lootTarget) return;
        this.doMoveTowards(this.lootTarget.x, this.lootTarget.y, map, dt);
    }

    doFleeZone(safeZone, map, dt) {
        const angle = angleBetween(this.x, this.y, safeZone.x, safeZone.y);
        this.angle = angle;

        const spd = this.getEffectiveSpeed();
        this.vx += Math.cos(angle) * spd * 1.25;
        this.vy += Math.sin(angle) * spd * 1.25;
        this.vx *= CONSTANTS.FRICTION;
        this.vy *= CONSTANTS.FRICTION;

        const newPos = map.resolveCollision(this.x, this.y, this.radius, this.vx, this.vy);
        this.x = newPos.x;
        this.y = newPos.y;
    }

    scanForTargets(player, enemies, lootManager, map) {
        const distToPlayer = distance(this.x, this.y, player.x, player.y);
        if (distToPlayer < this.detectionRange && player.alive) {
            if (map.hasLineOfSight(this.x, this.y, player.x, player.y)) {
                this.target = player;
                this.state = 'chase';
                this.stateTimer = 0;
                return;
            }
        }

        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (enemy !== this && enemy.alive) {
                const dist = distance(this.x, this.y, enemy.x, enemy.y);
                if (dist < this.detectionRange * 0.75) {
                    if (map.hasLineOfSight(this.x, this.y, enemy.x, enemy.y)) {
                        this.target = enemy;
                        this.state = 'chase';
                        this.stateTimer = 0;
                        return;
                    }
                }
            }
        }

        if (lootManager && this.stateTimer > 3000) {
            for (let i = 0; i < lootManager.items.length; i++) {
                const item = lootManager.items[i];
                const dist = distance(this.x, this.y, item.x, item.y);
                if (dist < 150) {
                    this.lootTarget = item;
                    this.state = 'loot';
                    this.stateTimer = 0;
                    return;
                }
            }
        }
    }

    shouldAttack() {
        if (!this.target) return false;
        const dist = distance(this.x, this.y, this.target.x, this.target.y);
        return dist < this.attackRange;
    }

    tryFire(game) {
        const weapon = this.inventory.getCurrentWeapon();
        if (!weapon || !weapon.canFire()) return null;

        // Smart skill usage: AI occasionally uses available skills in combat
        if (game && Math.random() < 0.2) {
            const targetPos = this.target ? { x: this.target.x, y: this.target.y } : null;
            if (this.canUseSkill(0)) {
                this.useSkill(0, targetPos, game);
            } else if (this.canUseSkill(1) && Math.random() < 0.3) {
                this.useSkill(1, targetPos, game);
            }
        }

        const projectiles = weapon.fire();
        if (!projectiles) return null;

        const results = [];
        for (let i = 0; i < projectiles.length; i++) {
            const projData = projectiles[i];
            const spread = projData.spread ? randomRange(-projData.spread, projData.spread) : 0;
            const angle = this.angle + spread;

            if (weapon.type === 'melee') {
                const attack = new MeleeAttack(
                    this.x + Math.cos(angle) * this.radius,
                    this.y + Math.sin(angle) * this.radius,
                    angle,
                    weapon.range,
                    Math.PI / 2,
                    weapon.damage,
                    this,
                    weapon.color
                );
                this.meleeAttacks.push(attack);
                results.push({ type: 'melee', attack });
            } else if (weapon.type === 'boomerang') {
                results.push({
                    type: 'boomerang',
                    angle,
                    data: projData
                });
            } else {
                results.push({
                    type: 'projectile',
                    angle,
                    data: projData
                });
            }
        }
        return results;
    }
}
