import { randomRange, parsePixiColor } from './utils.js';

class PooledParticle {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.color = '#ffd700';
        this.radius = 3;
        this.decay = 0.05;
        this.alpha = 1;
        this.life = 0;
        this.maxLife = 30;
        this.type = 'circle';
    }

    init(x, y, vx, vy, color, radius, decay, maxLife = 30, type = 'circle') {
        this.active = true;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.radius = radius;
        this.decay = decay;
        this.alpha = 1;
        this.life = 0;
        this.maxLife = maxLife;
        this.type = type;
    }

    update() {
        if (!this.active) return false;
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95;
        this.vy *= 0.95;
        this.alpha -= this.decay;
        this.life++;
        if (this.alpha <= 0 || this.life >= this.maxLife) {
            this.active = false;
            return false;
        }
        return true;
    }
}

export class ParticleSystem {
    constructor(maxParticles = 600) {
        this.poolSize = maxParticles;
        this.pool = new Array(this.poolSize);
        for (let i = 0; i < this.poolSize; i++) {
            this.pool[i] = new PooledParticle();
        }
        this.nextIndex = 0;
        this.camera = null;
    }

    clear() {
        for (let i = 0; i < this.poolSize; i++) {
            this.pool[i].active = false;
        }
    }

    spawn(x, y, vx, vy, color, radius, decay, maxLife, type = 'circle') {
        // Fast circular search for inactive slot
        for (let i = 0; i < this.poolSize; i++) {
            const idx = (this.nextIndex + i) % this.poolSize;
            if (!this.pool[idx].active) {
                this.nextIndex = (idx + 1) % this.poolSize;
                this.pool[idx].init(x, y, vx, vy, color, radius, decay, maxLife, type);
                return;
            }
        }
        // If pool is full, recycle oldest slot
        const idx = this.nextIndex;
        this.nextIndex = (this.nextIndex + 1) % this.poolSize;
        this.pool[idx].init(x, y, vx, vy, color, radius, decay, maxLife, type);
    }

    muzzleFlash(x, y, angle, color) {
        for (let i = 0; i < 7; i++) {
            const spread = randomRange(-0.35, 0.35);
            const speed = randomRange(4, 8.5);
            const vx = Math.cos(angle + spread) * speed;
            const vy = Math.sin(angle + spread) * speed;
            this.spawn(x, y, vx, vy, color, randomRange(2, 4), 0.08, 14, 'spark');
        }
    }

    slash(x, y, angle, color = '#ffd700') {
        const count = 10;
        for (let i = 0; i < count; i++) {
            const spread = randomRange(-0.6, 0.6);
            const speed = randomRange(3.5, 7.5);
            const sparkAngle = angle + spread;
            const vx = Math.cos(sparkAngle) * speed;
            const vy = Math.sin(sparkAngle) * speed;
            const perpAngle = angle + Math.PI / 2;
            const offsetDist = randomRange(-15, 15);
            const px = x + Math.cos(perpAngle) * offsetDist;
            const py = y + Math.sin(perpAngle) * offsetDist;
            this.spawn(px, py, vx, vy, color, randomRange(2, 3.5), 0.07, 16, 'spark');
        }
        for (let i = 0; i < 4; i++) {
            const spread = randomRange(-0.4, 0.4);
            const speed = randomRange(1.5, 4);
            const vx = Math.cos(angle + spread) * speed;
            const vy = Math.sin(angle + spread) * speed;
            this.spawn(x, y, vx, vy, '#ffffff', randomRange(1.5, 3), 0.06, 18, 'circle');
        }
    }

    airdropPillar(x, y) {
        for (let i = 0; i < 3; i++) {
            const vy = randomRange(-5.5, -2);
            const vx = randomRange(-0.6, 0.6);
            this.spawn(
                x + randomRange(-16, 16),
                y + randomRange(-6, 6),
                vx,
                vy,
                '#ffd700',
                randomRange(2.5, 4.5),
                0.03,
                35,
                'circle'
            );
        }
    }

    pickup(x, y) {
        for (let i = 0; i < 16; i++) {
            const angle = randomRange(0, Math.PI * 2);
            const speed = randomRange(2, 5);
            this.spawn(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '#ffd700',
                randomRange(2, 4),
                0.05,
                24,
                'circle'
            );
        }
    }

    heal(x, y) {
        for (let i = 0; i < 20; i++) {
            const angle = randomRange(0, Math.PI * 2);
            const speed = randomRange(1.5, 4.5);
            this.spawn(
                x + randomRange(-12, 12),
                y + randomRange(-12, 12),
                Math.cos(angle) * speed,
                Math.sin(angle) * speed - 1.5,
                Math.random() < 0.6 ? '#00e676' : '#69f0ae',
                randomRange(2.5, 5),
                0.04,
                26,
                'circle'
            );
        }
    }

    zoneDamage(x, y) {
        for (let i = 0; i < 4; i++) {
            const angle = randomRange(0, Math.PI * 2);
            const speed = randomRange(1, 2.5);
            this.spawn(
                x + randomRange(-10, 10),
                y + randomRange(-10, 10),
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                Math.random() < 0.5 ? '#ab47bc' : '#00e676',
                randomRange(2, 4.5),
                0.055,
                20,
                'circle'
            );
        }
    }

    hit(x, y, color) {
        for (let i = 0; i < 10; i++) {
            const angle = randomRange(0, Math.PI * 2);
            const speed = randomRange(2, 6);
            this.spawn(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color || '#ffd700',
                randomRange(2, 4),
                0.065,
                18,
                'spark'
            );
        }
    }

    burst(x, y, color, count = 16) {
        for (let i = 0; i < count; i++) {
            const angle = randomRange(0, Math.PI * 2);
            const speed = randomRange(2, 6);
            this.spawn(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color || '#ffd700',
                randomRange(2.5, 5),
                0.045,
                24,
                'circle'
            );
        }
    }

    death(x, y, color) {
        for (let i = 0; i < 26; i++) {
            const angle = randomRange(0, Math.PI * 2);
            const speed = randomRange(3, 7.5);
            this.spawn(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color || '#ff1744',
                randomRange(3, 6),
                0.038,
                32,
                'circle'
            );
        }
    }

    woodSplinter(x, y, isBreak = false) {
        const count = isBreak ? 22 : 8;
        const colors = ['#8d6e63', '#a1887f', '#d7ccc8', '#5d4037', '#bcaaa4'];
        for (let i = 0; i < count; i++) {
            const angle = randomRange(0, Math.PI * 2);
            const speed = randomRange(isBreak ? 2.5 : 1.5, isBreak ? 6.5 : 4.5);
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.spawn(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color,
                randomRange(2.5, isBreak ? 5.5 : 3.5),
                isBreak ? 0.04 : 0.06,
                isBreak ? 28 : 18,
                'spark'
            );
        }
    }

    update() {
        for (let i = 0; i < this.poolSize; i++) {
            if (this.pool[i].active) {
                this.pool[i].update();
            }
        }
    }

    draw(ctx, camera) {
        const cam = camera || this.camera;
        let camX = 0;
        let camY = 0;

        if (cam) {
            camX = typeof cam.getRenderX === 'function' ? cam.getRenderX() : (cam.x || 0);
            camY = typeof cam.getRenderY === 'function' ? cam.getRenderY() : (cam.y || 0);
        }

        const camW = ctx.canvas.width;
        const camH = ctx.canvas.height;

        ctx.save();

        // Single pass batch drawing: avoid save/restore per particle
        for (let i = 0; i < this.poolSize; i++) {
            const p = this.pool[i];
            if (!p.active) continue;

            const sx = p.x - camX;
            const sy = p.y - camY;
            if (sx < -30 || sx > camW + 30 || sy < -30 || sy > camH + 30) continue;

            ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));

            if (p.type === 'spark') {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx - p.vx * 1.8, sy - p.vy * 1.8);
                ctx.stroke();
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(sx, sy, Math.max(1, p.radius), 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    drawPixi(g) {
        if (!g) return;
        g.clear();
        for (let i = 0; i < this.poolSize; i++) {
            const p = this.pool[i];
            if (!p.active) continue;

            const alpha = Math.max(0, Math.min(1, p.alpha));
            const colNum = parsePixiColor(p.color || '#ffd700').color;

            if (p.type === 'spark') {
                g.moveTo(p.x, p.y)
                 .lineTo(p.x - p.vx * 1.8, p.y - p.vy * 1.8)
                 .stroke({ color: colNum, width: 2, alpha });
            } else {
                g.circle(p.x, p.y, Math.max(1, p.radius))
                 .fill({ color: colNum, alpha });
            }
        }
    }
}

