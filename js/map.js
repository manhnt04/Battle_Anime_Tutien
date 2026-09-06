import { CONSTANTS, distance, clamp, randomRange, randomInt, randomFloat, parsePixiColor } from './utils.js';

function lineIntersectsSegment(x1, y1, x2, y2, x3, y3, x4, y4) {
    const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
    if (Math.abs(d) < 0.00001) return false;

    const u = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
    const v = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;

    return u >= 0 && u <= 1 && v >= 0 && v <= 1;
}

function distToSegmentSquared(px, py, x1, y1, x2, y2) {
    const lineX = x2 - x1;
    const lineY = y2 - y1;
    const l2 = lineX * lineX + lineY * lineY;
    if (l2 === 0) {
        const dx = px - x1;
        const dy = py - y1;
        return dx * dx + dy * dy;
    }
    let t = ((px - x1) * lineX + (py - y1) * lineY) / l2;
    t = Math.max(0, Math.min(1, t));
    const dx = px - (x1 + t * lineX);
    const dy = py - (y1 + t * lineY);
    return dx * dx + dy * dy;
}

export class BreakableCrate {
    constructor(id, x, y, rarity = 'normal') {
        this.id = id;
        this.x = x;
        this.y = y;
        this.w = 34;
        this.h = 34;
        this.rarity = rarity; // 'normal' or 'gold'
        this.maxHealth = rarity === 'gold' ? 65 : 40;
        this.health = this.maxHealth;
        this.alive = true;
        this.destroyed = false;
        this.hitFlash = 0;
        this.lastQuery = 0;
        this.type = 'rect';
        this.subtype = 'crate';
    }

    takeDamage(amount) {
        if (!this.alive) return false;
        this.health -= amount;
        this.hitFlash = 120;
        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
            return true;
        }
        return false;
    }

    get centerX() {
        return this.x + this.w / 2;
    }

    get centerY() {
        return this.y + this.h / 2;
    }

    get radius() {
        return this.w / 2;
    }

    draw(ctx, camera) {
        if (!this.alive) return;
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        ctx.save();
        if (this.hitFlash > 0) {
            ctx.filter = 'brightness(1.5)';
            this.hitFlash = Math.max(0, this.hitFlash - 16);
        }

        // Drop shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(sx + 3, sy + 3, this.w, this.h);

        const isGold = this.rarity === 'gold';

        // Base box
        ctx.fillStyle = isGold ? '#5d4037' : '#4e342e';
        ctx.fillRect(sx, sy, this.w, this.h);

        // Wood planks horizontal lines
        ctx.strokeStyle = isGold ? '#3e2723' : '#321911';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy + 11);
        ctx.lineTo(sx + this.w, sy + 11);
        ctx.moveTo(sx, sy + 22);
        ctx.lineTo(sx + this.w, sy + 22);
        ctx.stroke();

        // House interiors sit below walls and remain visible/enterable.
        for (let i = 0; i < this.houses.length; i++) {
            const house = this.houses[i];
            if (house.x > endX || house.y > endY || house.x + house.w < camX || house.y + house.h < camY) continue;
            const hx = house.x - camX;
            const hy = house.y - camY;
            ctx.fillStyle = '#241915';
            ctx.fillRect(hx, hy, house.w, house.h);
            ctx.strokeStyle = 'rgba(255, 179, 0, 0.22)';
            ctx.lineWidth = 1;
            for (let x = house.wall; x < house.w - house.wall; x += 28) {
                ctx.beginPath();
                ctx.moveTo(hx + x, hy + house.wall);
                ctx.lineTo(hx + x, hy + house.h - house.wall);
                ctx.stroke();
            }
        }

        // Cross-brace diagonal
        ctx.strokeStyle = isGold ? 'rgba(255, 215, 0, 0.45)' : 'rgba(30, 15, 10, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx + 3, sy + 3);
        ctx.lineTo(sx + this.w - 3, sy + this.h - 3);
        ctx.moveTo(sx + this.w - 3, sy + 3);
        ctx.lineTo(sx + 3, sy + this.h - 3);
        ctx.stroke();

        // Outer iron / gold band border
        ctx.strokeStyle = isGold ? '#ffd700' : '#8d6e63';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(sx, sy, this.w, this.h);

        // Corner studs / corner brackets
        ctx.fillStyle = isGold ? '#ffe082' : '#bcaaa4';
        const stud = 3;
        ctx.fillRect(sx + 2, sy + 2, stud, stud);
        ctx.fillRect(sx + this.w - 5, sy + 2, stud, stud);
        ctx.fillRect(sx + 2, sy + this.h - 5, stud, stud);
        ctx.fillRect(sx + this.w - 5, sy + this.h - 5, stud, stud);

        // Gold chest star emblem
        if (isGold) {
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#ffd700';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⭐', sx + this.w / 2, sy + this.h / 2);
            ctx.shadowBlur = 0;
        }

        // Health bar if damaged
        if (this.health < this.maxHealth) {
            const barW = this.w;
            const barH = 4;
            const barY = sy - 7;
            const hpPct = Math.max(0, this.health / this.maxHealth);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(sx, barY, barW, barH);

            ctx.fillStyle = hpPct > 0.5 ? '#00e676' : (hpPct > 0.25 ? '#ffd700' : '#ff1744');
            ctx.fillRect(sx, barY, barW * hpPct, barH);
        }

        ctx.restore();
    }

    initPixi(parentLayer) {
        if (typeof window === 'undefined' || !window.PIXI) return;
        this.destroyPixi();

        this.view = new window.PIXI.Graphics();
        if (parentLayer) {
            parentLayer.addChild(this.view);
            this.parentLayer = parentLayer;
        }
        this.updatePixiView();
    }

    destroyPixi() {
        if (this.view) {
            if (this.parentLayer) {
                this.parentLayer.removeChild(this.view);
            }
            this.view.destroy();
            this.view = null;
            this.parentLayer = null;
        }
    }

    updatePixiView() {
        if (!this.view) return;
        if (!this.alive || this.destroyed) {
            this.view.visible = false;
            return;
        }
        this.view.visible = true;
        this.view.clear();

        const isGold = this.rarity === 'gold';
        const boxCol = isGold ? 0x5d4037 : 0x4e342e;
        const plankCol = isGold ? 0x3e2723 : 0x321911;
        const borderCol = isGold ? 0xffd700 : 0x8d6e63;

        // Shadow
        this.view.rect(this.x + 3, this.y + 3, this.w, this.h)
                 .fill({ color: 0x000000, alpha: 0.35 });

        // Base box
        this.view.rect(this.x, this.y, this.w, this.h)
                 .fill({ color: boxCol, alpha: 1 });

        // Wood planks lines
        this.view.moveTo(this.x, this.y + 11).lineTo(this.x + this.w, this.y + 11)
                 .stroke({ color: plankCol, width: 1.5, alpha: 0.9 });
        this.view.moveTo(this.x, this.y + 22).lineTo(this.x + this.w, this.y + 22)
                 .stroke({ color: plankCol, width: 1.5, alpha: 0.9 });

        // Cross braces
        this.view.moveTo(this.x + 3, this.y + 3).lineTo(this.x + this.w - 3, this.y + this.h - 3)
                 .stroke({ color: isGold ? 0xffd700 : 0x1e0f0a, width: 2, alpha: 0.45 });
        this.view.moveTo(this.x + this.w - 3, this.y + 3).lineTo(this.x + 3, this.y + this.h - 3)
                 .stroke({ color: isGold ? 0xffd700 : 0x1e0f0a, width: 2, alpha: 0.45 });

        // Border
        this.view.rect(this.x, this.y, this.w, this.h)
                 .stroke({ color: borderCol, width: 2.5, alpha: 1 });

        // Gold chest star indicator
        if (isGold) {
            this.view.circle(this.centerX, this.centerY, 6)
                     .fill({ color: 0xffd700, alpha: 0.85 });
        }

        // Mini health bar if damaged
        if (this.health < this.maxHealth) {
            const hpPct = clamp(this.health / this.maxHealth, 0, 1);
            const barW = this.w;
            const barH = 4;
            const barY = this.y - 7;
            const hpCol = hpPct > 0.5 ? 0x00e676 : hpPct > 0.25 ? 0xffd600 : 0xff1744;

            this.view.rect(this.x, barY, barW, barH).fill({ color: 0x000000, alpha: 0.7 });
            this.view.rect(this.x, barY, barW * hpPct, barH).fill({ color: hpCol, alpha: 1 });
        }
    }
}


export class GameMap {
    constructor() {
        this.width = CONSTANTS.MAP_WIDTH;
        this.height = CONSTANTS.MAP_HEIGHT;
        this.obstacles = [];
        this.crates = [];
        this.houses = [];

        // Spatial Hash Grid
        this.cellSize = 200;
        this.gridCols = Math.ceil(this.width / this.cellSize);
        this.gridRows = Math.ceil(this.height / this.cellSize);
        this.grid = new Array(this.gridCols * this.gridRows).fill(null).map(() => []);
        this.queryId = 0;
        this.nearbyBuffer = [];

        this.generateObstacles();
    }

    generateObstacles() {
        this.obstacles = [];
        this.crates = [];
        this.houses = [];
        this.brokenCrateIds = new Set();
        let idCounter = 0;

        // Enterable houses: four physical walls with a doorway in the south wall.
        const buildingCount = 28;
        for (let i = 0; i < buildingCount; i++) {
            const bx = randomRange(250, this.width - 500);
            const by = randomRange(250, this.height - 500);
            const bw = randomRange(190, 270);
            const bh = randomRange(150, 220);
            const wall = 16;
            const doorWidth = 62;
            const doorLeft = bx + (bw - doorWidth) / 2;
            const house = { x: bx, y: by, w: bw, h: bh, wall, doorWidth };
            this.houses.push(house);

            const wallRects = [
                { x: bx, y: by, w: bw, h: wall },
                { x: bx, y: by, w: wall, h: bh },
                { x: bx + bw - wall, y: by, w: wall, h: bh },
                { x: bx, y: by + bh - wall, w: doorLeft - bx, h: wall },
                { x: doorLeft + doorWidth, y: by + bh - wall, w: bx + bw - doorLeft - doorWidth, h: wall }
            ];
            for (let w = 0; w < wallRects.length; w++) {
                this.obstacles.push({
                    id: `wall_${idCounter++}`,
                    lastQuery: 0,
                    type: 'rect',
                    subtype: 'house_wall',
                    ...wallRects[w],
                    color: '#5d2a1d'
                });
            }

            // Every house contains lootable chests, reachable through the door.
            const houseCrateCount = randomInt(1, 2);
            for (let c = 0; c < houseCrateCount; c++) {
                const isGold = randomFloat() < 0.3;
                const crate = new BreakableCrate(
                    `crate_${idCounter++}`,
                    randomRange(bx + wall + 22, bx + bw - wall - 56),
                    randomRange(by + wall + 22, by + bh - wall - 56),
                    isGold ? 'gold' : 'normal'
                );
                this.crates.push(crate);
                this.obstacles.push(crate);
            }
        }

        // Additional scattered breakable crates in wilderness (~35 crates)
        const wildernessCrateCount = 35;
        for (let w = 0; w < wildernessCrateCount; w++) {
            const isGold = randomFloat() < 0.20;
            const cx = randomRange(180, this.width - 180);
            const cy = randomRange(180, this.height - 180);
            const crate = new BreakableCrate(
                `crate_${idCounter++}`,
                cx,
                cy,
                isGold ? 'gold' : 'normal'
            );
            this.crates.push(crate);
            this.obstacles.push(crate);
        }

        // Ancient Mountain Rocks (Sơn Thạch Trận)
        const rockCount = 65;
        for (let i = 0; i < rockCount; i++) {
            this.obstacles.push({
                id: `rock_${idCounter++}`,
                lastQuery: 0,
                type: 'circle',
                subtype: 'rock',
                x: randomRange(150, this.width - 150),
                y: randomRange(150, this.height - 150),
                radius: randomRange(24, 48),
                color: '#546e7a'
            });
        }

        // Walkable brush clusters used for concealment.
        const bushCount = 95;
        for (let i = 0; i < bushCount; i++) {
            const bushRadius = randomRange(38, 58);
            this.obstacles.push({
                id: `bush_${idCounter++}`,
                lastQuery: 0,
                type: 'circle',
                subtype: 'bush',
                x: randomRange(120, this.width - 120),
                y: randomRange(120, this.height - 120),
                radius: bushRadius,
                canopyRadius: bushRadius,
                color: randomFloat() < 0.55 ? '#287a3d' : '#1f6635'
            });
        }

        // Populate Spatial Grid
        this.rebuildSpatialGrid();
    }

    rebuildSpatialGrid() {
        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i].length = 0;
        }

        for (const obs of this.obstacles) {
            let minCol, maxCol, minRow, maxRow;
            if (obs.type === 'rect') {
                minCol = clamp(Math.floor(obs.x / this.cellSize), 0, this.gridCols - 1);
                maxCol = clamp(Math.floor((obs.x + obs.w) / this.cellSize), 0, this.gridCols - 1);
                minRow = clamp(Math.floor(obs.y / this.cellSize), 0, this.gridRows - 1);
                maxRow = clamp(Math.floor((obs.y + obs.h) / this.cellSize), 0, this.gridRows - 1);
            } else {
                const r = obs.radius;
                minCol = clamp(Math.floor((obs.x - r) / this.cellSize), 0, this.gridCols - 1);
                maxCol = clamp(Math.floor((obs.x + r) / this.cellSize), 0, this.gridCols - 1);
                minRow = clamp(Math.floor((obs.y - r) / this.cellSize), 0, this.gridRows - 1);
                maxRow = clamp(Math.floor((obs.y + r) / this.cellSize), 0, this.gridRows - 1);
            }

            for (let c = minCol; c <= maxCol; c++) {
                for (let r = minRow; r <= maxRow; r++) {
                    this.grid[r * this.gridCols + c].push(obs);
                }
            }
        }
    }

    destroyCrate(crate, lootManager, particles, audio, isRemote = false) {
        if (!crate || crate.destroyed) return;
        crate.destroyed = true;
        crate.alive = false;
        if (!this.brokenCrateIds) this.brokenCrateIds = new Set();
        this.brokenCrateIds.add(crate.id);

        if (typeof crate.destroyPixi === 'function') {
            crate.destroyPixi();
        }
        const idx = this.obstacles.indexOf(crate);
        if (idx !== -1) {
            this.obstacles.splice(idx, 1);
        }
        const crateIdx = this.crates.indexOf(crate);
        if (crateIdx !== -1) {
            this.crates.splice(crateIdx, 1);
        }
        this.rebuildSpatialGrid();

        const cx = crate.x + crate.w / 2;
        const cy = crate.y + crate.h / 2;

        if (particles && typeof particles.woodSplinter === 'function') {
            particles.woodSplinter(cx, cy, true);
        }
        if (audio && typeof audio.playWoodBreak === 'function') {
            audio.playWoodBreak();
        }
        if (lootManager && typeof lootManager.spawnCrateLoot === 'function') {
            lootManager.spawnCrateLoot(cx, cy, crate.rarity);
        }

        if (!isRemote && typeof window !== 'undefined' && window.game && window.game.networkManager) {
            window.game.networkManager.sendLocalAction('destroy_crate', { crateId: crate.id });
        }
    }

    findCrateById(id) {
        if (!this.crates) return null;
        for (let i = 0; i < this.crates.length; i++) {
            if (this.crates[i].id === id) return this.crates[i];
        }
        return null;
    }

    destroyCrateById(id, lootManager, particles, audio, isRemote = false) {
        const crate = this.findCrateById(id);
        if (crate && !crate.destroyed) {
            this.destroyCrate(crate, lootManager, particles, audio, isRemote);
        }
    }

    findCrateAt(x, y, radius) {
        const candidates = this.getNearbyObstacles(x - radius, y - radius, x + radius, y + radius);
        for (let i = 0; i < candidates.length; i++) {
            const obs = candidates[i];
            if (obs.subtype === 'crate' && obs.alive) {
                const nearestX = clamp(x, obs.x, obs.x + obs.w);
                const nearestY = clamp(y, obs.y, obs.y + obs.h);
                const dx = x - nearestX;
                const dy = y - nearestY;
                if (dx * dx + dy * dy < radius * radius) {
                    return obs;
                }
            }
        }
        return null;
    }

    getNearbyObstacles(minX, minY, maxX, maxY) {
        this.queryId++;
        this.nearbyBuffer.length = 0;

        const minCol = clamp(Math.floor(minX / this.cellSize), 0, this.gridCols - 1);
        const maxCol = clamp(Math.floor(maxX / this.cellSize), 0, this.gridCols - 1);
        const minRow = clamp(Math.floor(minY / this.cellSize), 0, this.gridRows - 1);
        const maxRow = clamp(Math.floor(maxY / this.cellSize), 0, this.gridRows - 1);

        for (let c = minCol; c <= maxCol; c++) {
            for (let r = minRow; r <= maxRow; r++) {
                const cell = this.grid[r * this.gridCols + c];
                for (let i = 0; i < cell.length; i++) {
                    const obs = cell[i];
                    if (obs.lastQuery !== this.queryId) {
                        obs.lastQuery = this.queryId;
                        this.nearbyBuffer.push(obs);
                    }
                }
            }
        }
        return this.nearbyBuffer;
    }

    hasLineOfSight(x1, y1, x2, y2) {
        const sightDx = x2 - x1;
        const sightDy = y2 - y1;
        if (sightDx * sightDx + sightDy * sightDy <= 85 * 85) return true;

        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        const candidates = this.getNearbyObstacles(minX, minY, maxX, maxY);
        for (let i = 0; i < candidates.length; i++) {
            const obs = candidates[i];
            if (obs.type === 'rect') {
                const left = obs.x;
                const top = obs.y;
                const right = obs.x + obs.w;
                const bottom = obs.y + obs.h;

                if (lineIntersectsSegment(x1, y1, x2, y2, left, top, right, top) ||
                    lineIntersectsSegment(x1, y1, x2, y2, right, top, right, bottom) ||
                    lineIntersectsSegment(x1, y1, x2, y2, left, bottom, right, bottom) ||
                    lineIntersectsSegment(x1, y1, x2, y2, left, top, left, bottom)) {
                    return false;
                }
            } else if (obs.type === 'circle') {
                const blockRadius = obs.subtype === 'rock' ? obs.radius * 0.9 : obs.radius * 0.8;
                const d2 = distToSegmentSquared(obs.x, obs.y, x1, y1, x2, y2);
                if (d2 < blockRadius * blockRadius) {
                    return false;
                }
            }
        }
        return true;
    }

    clampSkillTarget(x1, y1, x2, y2, radius = 4) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.hypot(dx, dy);
        if (dist <= 0.001) return { x: x1, y: y1 };

        const steps = Math.max(1, Math.ceil(dist / 10));
        let safeX = x1;
        let safeY = y1;
        for (let i = 1; i <= steps; i++) {
            const ratio = i / steps;
            const testX = x1 + dx * ratio;
            const testY = y1 + dy * ratio;
            if (this.checkCollision(testX, testY, radius)) break;
            safeX = testX;
            safeY = testY;
        }
        return { x: safeX, y: safeY };
    }

    getRandomSpawnPoint(radius, minDistanceFromCenter = 0) {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const margin = 150;

        for (let attempt = 0; attempt < 200; attempt++) {
            const x = randomRange(margin, this.width - margin);
            const y = randomRange(margin, this.height - margin);

            if (minDistanceFromCenter > 0 && distance(x, y, centerX, centerY) < minDistanceFromCenter) {
                continue;
            }

            if (!this.checkCollision(x, y, radius + 25)) {
                return { x, y };
            }
        }

        return {
            x: randomRange(margin, this.width - margin),
            y: randomRange(margin, this.height - margin)
        };
    }

    checkCollision(x, y, radius) {
        if (x - radius < 0 || x + radius > this.width || y - radius < 0 || y + radius > this.height) {
            return true;
        }

        const candidates = this.getNearbyObstacles(x - radius, y - radius, x + radius, y + radius);
        for (let i = 0; i < candidates.length; i++) {
            const obs = candidates[i];
            if (obs.type === 'circle') {
                const dx = x - obs.x;
                const dy = y - obs.y;
                const minDist = radius + obs.radius;
                if (dx * dx + dy * dy < minDist * minDist) {
                    return true;
                }
            } else if (obs.type === 'rect') {
                const nearestX = clamp(x, obs.x, obs.x + obs.w);
                const nearestY = clamp(y, obs.y, obs.y + obs.h);
                const dx = x - nearestX;
                const dy = y - nearestY;
                if (dx * dx + dy * dy < radius * radius) {
                    return true;
                }
            }
        }
        return false;
    }

    resolveCollision(x, y, radius, vx, vy) {
        let nextX = x + vx;
        let nextY = y;

        // Try X-axis move
        if (this.checkCollision(nextX, nextY, radius)) {
            nextX = x;
        }

        // Try Y-axis move
        nextY = y + vy;
        if (this.checkCollision(nextX, nextY, radius)) {
            nextY = y;
        }

        // Anti-corner sticking push-out: if still colliding after sliding
        if (this.checkCollision(nextX, nextY, radius)) {
            const candidates = this.getNearbyObstacles(nextX - radius - 5, nextY - radius - 5, nextX + radius + 5, nextY + radius + 5);
            for (let i = 0; i < candidates.length; i++) {
                const obs = candidates[i];
                if (obs.type === 'circle') {
                    const dx = nextX - obs.x;
                    const dy = nextY - obs.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = radius + obs.radius;
                    if (dist < minDist && dist > 0.001) {
                        const overlap = minDist - dist;
                        nextX += (dx / dist) * overlap;
                        nextY += (dy / dist) * overlap;
                    } else if (dist <= 0.001) {
                        const pushX = Math.abs(vx) > 0.001 ? -Math.sign(vx) : 1;
                        nextX = obs.x + pushX * minDist;
                    }
                } else if (obs.type === 'rect') {
                    const nearestX = clamp(nextX, obs.x, obs.x + obs.w);
                    const nearestY = clamp(nextY, obs.y, obs.y + obs.h);
                    const dx = nextX - nearestX;
                    const dy = nextY - nearestY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < radius && dist > 0.001) {
                        const overlap = radius - dist;
                        nextX += (dx / dist) * overlap;
                        nextY += (dy / dist) * overlap;
                    } else if (dist <= 0.001) {
                        // The circle centre is inside the rectangle. Push it to
                        // the closest side of the radius-expanded hitbox.
                        const expandedLeft = obs.x - radius;
                        const expandedRight = obs.x + obs.w + radius;
                        const expandedTop = obs.y - radius;
                        const expandedBottom = obs.y + obs.h + radius;
                        const leftDepth = Math.abs(nextX - expandedLeft);
                        const rightDepth = Math.abs(expandedRight - nextX);
                        const topDepth = Math.abs(nextY - expandedTop);
                        const bottomDepth = Math.abs(expandedBottom - nextY);
                        const minDepth = Math.min(leftDepth, rightDepth, topDepth, bottomDepth);
                        if (minDepth === leftDepth) nextX = expandedLeft;
                        else if (minDepth === rightDepth) nextX = expandedRight;
                        else if (minDepth === topDepth) nextY = expandedTop;
                        else nextY = expandedBottom;
                    }
                }
            }
        }

        nextX = clamp(nextX, radius, this.width - radius);
        nextY = clamp(nextY, radius, this.height - radius);

        return { x: nextX, y: nextY };
    }

    draw(ctx, camera) {
        const camX = camera.x;
        const camY = camera.y;
        const camW = camera.width;
        const camH = camera.height;

        // Ground grid - Batched single path
        const gridSize = 120;
        const startX = Math.floor(camX / gridSize) * gridSize;
        const startY = Math.floor(camY / gridSize) * gridSize;
        const endX = camX + camW;
        const endY = camY + camH;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 235, 180, 0.035)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = startX; x <= endX; x += gridSize) {
            const sx = x - camX;
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx, camH);
        }
        for (let y = startY; y <= endY; y += gridSize) {
            const sy = y - camY;
            ctx.moveTo(0, sy);
            ctx.lineTo(camW, sy);
        }
        ctx.stroke();

        // Query visible obstacles via Spatial Grid
        const visibleObs = this.getNearbyObstacles(camX - 60, camY - 60, camX + camW + 60, camY + camH + 60);

        // Draw visible obstacles
        for (let i = 0; i < visibleObs.length; i++) {
            const obs = visibleObs[i];
            if (obs.type === 'rect') {
                const sx = obs.x - camX;
                const sy = obs.y - camY;

                // Deep Shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                ctx.fillRect(sx + 8, sy + 8, obs.w, obs.h);

                if (obs.subtype === 'pavilion') {
                    // Pavilion base
                    ctx.fillStyle = '#2d1d19';
                    ctx.fillRect(sx, sy, obs.w, obs.h);

                    // Ancient curved tiled roof
                    ctx.fillStyle = obs.roofColor || '#d84315';
                    ctx.beginPath();
                    ctx.moveTo(sx - 10, sy - 8);
                    ctx.lineTo(sx + obs.w + 10, sy - 8);
                    ctx.lineTo(sx + obs.w, sy + obs.h + 8);
                    ctx.lineTo(sx, sy + obs.h + 8);
                    ctx.closePath();
                    ctx.fill();

                    // Central courtyard / chamber
                    ctx.fillStyle = '#1c1210';
                    ctx.fillRect(sx + 14, sy + 14, obs.w - 28, obs.h - 28);

                    // Golden roof ridge line
                    ctx.strokeStyle = '#ffb300';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(sx + 8, sy + obs.h / 2);
                    ctx.lineTo(sx + obs.w - 8, sy + obs.h / 2);
                    ctx.stroke();
                } else if (typeof obs.draw === 'function') {
                    obs.draw(ctx, camera);
                } else {
                    // Default crate / stone lantern
                    ctx.fillStyle = obs.color || '#4e342e';
                    ctx.fillRect(sx, sy, obs.w, obs.h);
                    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(sx, sy, obs.w, obs.h);
                }
            } else if (obs.type === 'circle') {
                const sx = obs.x - camX;
                const sy = obs.y - camY;
                const r = obs.canopyRadius || obs.radius;

                // Shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.beginPath();
                ctx.ellipse(sx, sy + r * 0.4, r, r * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();

                if (obs.subtype === 'bamboo' || obs.subtype === 'pine') {
                    // Trunk
                    ctx.fillStyle = '#4e342e';
                    ctx.beginPath();
                    ctx.arc(sx, sy, obs.radius, 0, Math.PI * 2);
                    ctx.fill();

                    // Canopy
                    ctx.fillStyle = obs.color;
                    ctx.beginPath();
                    ctx.arc(sx, sy, obs.canopyRadius, 0, Math.PI * 2);
                    ctx.fill();

                    // Highlights
                    ctx.fillStyle = 'rgba(129, 199, 132, 0.35)';
                    ctx.beginPath();
                    ctx.arc(sx - 8, sy - 8, obs.canopyRadius * 0.55, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // Mountain Rocks (Sơn Thạch)
                    ctx.fillStyle = obs.color;
                    ctx.beginPath();
                    ctx.arc(sx, sy, obs.radius, 0, Math.PI * 2);
                    ctx.fill();

                    // Mossy / rock ridge
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                    ctx.beginPath();
                    ctx.arc(sx - obs.radius * 0.35, sy - obs.radius * 0.35, obs.radius * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Map boundary: Ancient Forbidden Barrier
        ctx.strokeStyle = '#d50000';
        ctx.lineWidth = 10;
        ctx.strokeRect(-camX, -camY, this.width, this.height);

        ctx.restore();
    }

    initPixi(groundLayer, obstacleLayer) {
        if (typeof window === 'undefined' || !window.PIXI) return;
        this.groundLayer = groundLayer;
        this.obstacleLayer = obstacleLayer;

        if (groundLayer) {
            groundLayer.removeChildren();
            const g = new window.PIXI.Graphics();

            // Background terrain
            g.rect(0, 0, this.width, this.height).fill({ color: 0x1e2920, alpha: 1 });

            // Subtle grid lines across whole map
            const gridSize = 120;
            for (let x = 0; x <= this.width; x += gridSize) {
                g.moveTo(x, 0).lineTo(x, this.height)
                 .stroke({ color: 0xffebb4, width: 1, alpha: 0.035 });
            }
            for (let y = 0; y <= this.height; y += gridSize) {
                g.moveTo(0, y).lineTo(this.width, y)
                 .stroke({ color: 0xffebb4, width: 1, alpha: 0.035 });
            }

            // Boundary border
            g.rect(0, 0, this.width, this.height)
             .stroke({ color: 0xd50000, width: 10, alpha: 0.9 });

            // Enterable house floors. Walls and chests are drawn above them.
            for (let i = 0; i < this.houses.length; i++) {
                const house = this.houses[i];
                g.rect(house.x, house.y, house.w, house.h)
                    .fill({ color: 0x241915, alpha: 1 });
                g.rect(house.x + house.wall, house.y + house.wall,
                    house.w - house.wall * 2, house.h - house.wall * 2)
                    .stroke({ color: 0xffb300, width: 1, alpha: 0.22 });
            }

            groundLayer.addChild(g);
        }

        if (obstacleLayer) {
            obstacleLayer.removeChildren();
            const staticG = new window.PIXI.Graphics();

            for (let i = 0; i < this.obstacles.length; i++) {
                const obs = this.obstacles[i];
                if (obs.subtype === 'crate') {
                    obs.initPixi(obstacleLayer);
                    continue;
                }

                if (obs.type === 'rect') {
                    // Deep Shadow
                    staticG.rect(obs.x + 8, obs.y + 8, obs.w, obs.h)
                           .fill({ color: 0x000000, alpha: 0.35 });

                    if (obs.subtype === 'pavilion') {
                        // Pavilion base
                        staticG.rect(obs.x, obs.y, obs.w, obs.h)
                               .fill({ color: 0x2d1d19, alpha: 1 });

                        // Roof
                        const roofCol = parsePixiColor(obs.roofColor || '#d84315').color;
                        staticG.poly([
                            obs.x - 10, obs.y - 8,
                            obs.x + obs.w + 10, obs.y - 8,
                            obs.x + obs.w, obs.y + obs.h + 8,
                            obs.x, obs.y + obs.h + 8
                        ], true).fill({ color: roofCol, alpha: 1 });

                        // Central courtyard
                        staticG.rect(obs.x + 14, obs.y + 14, obs.w - 28, obs.h - 28)
                               .fill({ color: 0x1c1210, alpha: 1 });

                        // Golden roof ridge line
                        staticG.moveTo(obs.x + 8, obs.y + obs.h / 2)
                               .lineTo(obs.x + obs.w - 8, obs.y + obs.h / 2)
                               .stroke({ color: 0xffb300, width: 2, alpha: 1 });
                    } else {
                        // Default wall / stone lantern
                        const col = parsePixiColor(obs.color || '#4e342e').color;
                        staticG.rect(obs.x, obs.y, obs.w, obs.h)
                               .fill({ color: col, alpha: 1 });
                        staticG.rect(obs.x, obs.y, obs.w, obs.h)
                               .stroke({ color: 0xffd700, width: 2, alpha: 0.3 });
                    }
                } else if (obs.type === 'circle') {
                    const r = obs.canopyRadius || obs.radius;
                    // Shadow
                    staticG.ellipse(obs.x, obs.y + r * 0.4, r, r * 0.5)
                           .fill({ color: 0x000000, alpha: 0.3 });

                    if (obs.subtype === 'bamboo' || obs.subtype === 'pine') {
                        // Trunk
                        staticG.circle(obs.x, obs.y, obs.radius)
                               .fill({ color: 0x4e342e, alpha: 1 });
                        // Canopy
                        const treeCol = parsePixiColor(obs.color || '#2e7d32').color;
                        staticG.circle(obs.x, obs.y, obs.canopyRadius)
                               .fill({ color: treeCol, alpha: 1 });
                        // Highlight
                        staticG.circle(obs.x - 8, obs.y - 8, obs.canopyRadius * 0.55)
                               .fill({ color: 0x81c784, alpha: 0.35 });
                    } else {
                        // Mountain Rocks (Sơn Thạch)
                        const stoneCol = parsePixiColor(obs.color || '#546e7a').color;
                        staticG.circle(obs.x, obs.y, obs.radius)
                               .fill({ color: stoneCol, alpha: 1 });
                        // Ridge highlight
                        staticG.circle(obs.x - obs.radius * 0.35, obs.y - obs.radius * 0.35, obs.radius * 0.4)
                               .fill({ color: 0xffffff, alpha: 0.15 });
                    }
                }
            }

            obstacleLayer.addChild(staticG);
        }
    }

    drawMinimap(minimapCtx, camera, players, enemies, safeZone) {
        const mw = minimapCtx.canvas.width;
        const mh = minimapCtx.canvas.height;
        const scaleX = mw / this.width;
        const scaleY = mh / this.height;

        // Background
        minimapCtx.fillStyle = '#141e17';
        minimapCtx.fillRect(0, 0, mw, mh);

        // Safe zone (Khu Vực An Toàn)
        if (safeZone) {
            minimapCtx.save();
            const zx = safeZone.x * scaleX;
            const zy = safeZone.y * scaleY;
            const zr = safeZone.radius * scaleX;

            minimapCtx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
            minimapCtx.lineWidth = 2;
            minimapCtx.beginPath();
            minimapCtx.arc(zx, zy, Math.max(1, zr), 0, Math.PI * 2);
            minimapCtx.stroke();

            // Next safe zone preview
            if (safeZone.shrinking) {
                const nzx = safeZone.nextX * scaleX;
                const nzy = safeZone.nextY * scaleY;
                const nzr = safeZone.targetRadius * scaleX;
                minimapCtx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
                minimapCtx.setLineDash([3, 2]);
                minimapCtx.beginPath();
                minimapCtx.arc(nzx, nzy, Math.max(1, nzr), 0, Math.PI * 2);
                minimapCtx.stroke();
                minimapCtx.setLineDash([]);
            }
            minimapCtx.restore();
        }

        // Camera viewport box
        minimapCtx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        minimapCtx.lineWidth = 1;
        minimapCtx.strokeRect(camera.x * scaleX, camera.y * scaleY, camera.width * scaleX, camera.height * scaleY);

        const player = players && players[0];

        // Enemies on minimap: ONLY visible if in LOS
        if (enemies && player && player.alive) {
            minimapCtx.fillStyle = '#ff1744';
            for (let i = 0; i < enemies.length; i++) {
                const enemy = enemies[i];
                if (enemy.alive) {
                    if (this.hasLineOfSight(player.x, player.y, enemy.x, enemy.y)) {
                        minimapCtx.fillRect(enemy.x * scaleX - 1.5, enemy.y * scaleY - 1.5, 3, 3);
                    }
                }
            }
        }

        // Player Icon, Heading Cone & Safe Direction Indicator
        if (player && player.alive) {
            const px = player.x * scaleX;
            const py = player.y * scaleY;

            // 1. Safe Direction Beacon (Hướng An Toàn)
            if (safeZone) {
                const distToCenter = distance(player.x, player.y, safeZone.x, safeZone.y);
                const isInside = distToCenter <= safeZone.radius;
                const angleToZone = Math.atan2(safeZone.y - player.y, safeZone.x - player.x);

                minimapCtx.save();
                if (!isInside) {
                    // OUTSIDE SAFE ZONE: Vivid pulsing guidance arrow towards safe zone
                    const lineLen = Math.min(36, Math.max(16, (distToCenter - safeZone.radius) * scaleX));
                    const endX = px + Math.cos(angleToZone) * lineLen;
                    const endY = py + Math.sin(angleToZone) * lineLen;

                    minimapCtx.strokeStyle = '#ffd700';
                    minimapCtx.lineWidth = 2;
                    minimapCtx.setLineDash([4, 3]);
                    minimapCtx.beginPath();
                    minimapCtx.moveTo(px, py);
                    minimapCtx.lineTo(endX, endY);
                    minimapCtx.stroke();
                    minimapCtx.setLineDash([]);

                    // Arrowhead
                    const arrowSize = 6;
                    minimapCtx.fillStyle = '#ff1744';
                    minimapCtx.beginPath();
                    minimapCtx.moveTo(endX, endY);
                    minimapCtx.lineTo(
                        endX - Math.cos(angleToZone - Math.PI / 6) * arrowSize,
                        endY - Math.sin(angleToZone - Math.PI / 6) * arrowSize
                    );
                    minimapCtx.lineTo(
                        endX - Math.cos(angleToZone + Math.PI / 6) * arrowSize,
                        endY - Math.sin(angleToZone + Math.PI / 6) * arrowSize
                    );
                    minimapCtx.closePath();
                    minimapCtx.fill();

                    // Alert beacon ring
                    minimapCtx.strokeStyle = 'rgba(255, 23, 68, 0.7)';
                    minimapCtx.lineWidth = 1.5;
                    minimapCtx.beginPath();
                    minimapCtx.arc(px, py, 7, 0, Math.PI * 2);
                    minimapCtx.stroke();
                } else if (safeZone.shrinking) {
                    // INSIDE SAFE ZONE BUT SHRINKING: Subtle guide to next zone center
                    const angleToNext = Math.atan2(safeZone.nextY - player.y, safeZone.nextX - player.x);
                    const guideLen = 18;
                    minimapCtx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
                    minimapCtx.lineWidth = 1.5;
                    minimapCtx.beginPath();
                    minimapCtx.moveTo(px, py);
                    minimapCtx.lineTo(px + Math.cos(angleToNext) * guideLen, py + Math.sin(angleToNext) * guideLen);
                    minimapCtx.stroke();
                }
                minimapCtx.restore();
            }

            // 2. Player Aiming / Heading Cone (Định hướng góc nhìn)
            minimapCtx.save();
            minimapCtx.translate(px, py);
            minimapCtx.rotate(player.angle || 0);

            // View cone
            minimapCtx.fillStyle = 'rgba(0, 229, 255, 0.25)';
            minimapCtx.beginPath();
            minimapCtx.moveTo(0, 0);
            minimapCtx.arc(0, 0, 14, -0.4, 0.4);
            minimapCtx.closePath();
            minimapCtx.fill();

            // Heading pointer tip
            minimapCtx.fillStyle = '#ffffff';
            minimapCtx.beginPath();
            minimapCtx.moveTo(7, 0);
            minimapCtx.lineTo(2, -3);
            minimapCtx.lineTo(2, 3);
            minimapCtx.closePath();
            minimapCtx.fill();

            // Player Central Dot: Luminous Cyan
            minimapCtx.fillStyle = '#00e5ff';
            minimapCtx.shadowColor = '#00e5ff';
            minimapCtx.shadowBlur = 6;
            minimapCtx.beginPath();
            minimapCtx.arc(0, 0, 3.5, 0, Math.PI * 2);
            minimapCtx.fill();
            minimapCtx.restore();
        }
    }
}
