import { ITEMS, getItemByName, randomRange, randomInt, parsePixiColor } from './utils.js';

export class LootItem {
    constructor(x, y, itemName) {
        const data = getItemByName(itemName);
        this.x = x;
        this.y = y;
        this.name = data.name;
        this.rawKey = itemName;
        this.type = (data.type === 'melee' || data.type === 'weapon') ? 'weapon' : data.type;
        this.subType = data.type;
        this.rarity = data.rarity || 'common';
        this.value = data.value || 0;
        this.ammoType = data.ammoType || null;
        this.amount = data.amount || 0;
        this.color = data.color;
        this.icon = data.icon;
        this.radius = 13;
        this.bobOffset = randomRange(0, Math.PI * 2);
        this.alive = true;
    }

    update() {
        this.bobOffset += 0.05;
    }

    draw(ctx, camera) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y + Math.sin(this.bobOffset) * 3.5;

        ctx.save();
        // Martial Qi Aura
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;

        // Circular background talisman badge
        ctx.fillStyle = 'rgba(15, 20, 28, 0.75)';
        ctx.beginPath();
        ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Golden / Jade border ring
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Legendary halo
        if (this.rarity === 'legendary') {
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 4, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Item icon
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, sx, sy);

        ctx.restore();
    }

    initPixi(parentLayer) {
        if (typeof window === 'undefined' || !window.PIXI) return;
        this.destroyPixi();

        this.view = new window.PIXI.Container();
        this.view.position.set(this.x, this.y + Math.sin(this.bobOffset) * 3.5);

        this.g = new window.PIXI.Graphics();
        const colNum = parsePixiColor(this.color || '#ffd700').color;

        // Talisman badge circle
        this.g.circle(0, 0, this.radius).fill({ color: 0x0f141c, alpha: 0.75 });
        this.g.circle(0, 0, this.radius).stroke({ color: colNum, width: 2, alpha: 0.9 });

        if (this.rarity === 'legendary') {
            this.g.circle(0, 0, this.radius + 4).stroke({ color: 0xffd700, width: 2.5, alpha: 0.95 });
        }

        this.txt = new window.PIXI.Text({
            text: this.icon || '⚔️',
            style: {
                fontSize: 13,
                fill: 0xffffff,
                align: 'center'
            }
        });
        this.txt.anchor.set(0.5);

        this.view.addChild(this.g);
        this.view.addChild(this.txt);

        if (parentLayer) {
            parentLayer.addChild(this.view);
            this.parentLayer = parentLayer;
        }
    }

    destroyPixi() {
        if (this.view) {
            if (this.parentLayer) {
                this.parentLayer.removeChild(this.view);
            }
            this.view.destroy({ children: true });
            this.view = null;
            this.parentLayer = null;
        }
    }

    updatePixiView() {
        if (!this.view) return;
        if (!this.alive) {
            this.view.visible = false;
            return;
        }
        this.view.visible = true;
        this.view.position.set(this.x, this.y + Math.sin(this.bobOffset) * 3.5);
    }
}

export class LootManager {
    constructor(map) {
        this.map = map;
        this.items = [];
        this.lootLayer = null;
        this.weaponNames = [
            'TRUONG_KIEM',
            'THIET_PHIEN',
            'LONG_UYET_DAO',
            'MA_THIEN_THUONG',
            'BACH_HOP_CUNG'
        ];
        this.legendaryWeapons = [
            'ZANGETSU',
            'ONE_FOR_ALL',
            'KATON',
            'EXCALIBUR',
            'GATE_OF_BABYLON'
        ];
        this.consumableNames = [
            'DAI_HOAN_DAN',
            'TIEU_HOAN_DAN',
            'NHUAN_VI_GIAP',
            'KIM_CHUNG_TRAO',
            'AMMO_TU_TIEN'
        ];
    }

    initPixi(lootLayer) {
        this.lootLayer = lootLayer;
        if (lootLayer) {
            lootLayer.removeChildren();
            for (const item of this.items) {
                item.initPixi(lootLayer);
            }
        }
    }

    generateLoot(count) {
        this.items = [];
        if (this.lootLayer) this.lootLayer.removeChildren();

        for (let i = 0; i < count; i++) {
            const pos = this.map.getRandomSpawnPoint(15);

            // 45% weapons, 55% pills & hidden weapons
            if (Math.random() < 0.45) {
                const weaponName = this.weaponNames[randomInt(0, this.weaponNames.length - 1)];
                const item = new LootItem(pos.x, pos.y, weaponName);
                if (this.lootLayer) item.initPixi(this.lootLayer);
                this.items.push(item);
            } else {
                const itemName = this.consumableNames[randomInt(0, this.consumableNames.length - 1)];
                const item = new LootItem(pos.x, pos.y, itemName);
                if (this.lootLayer) item.initPixi(this.lootLayer);
                this.items.push(item);
            }
        }
    }

    spawnWeapon(x, y, weaponName) {
        const item = new LootItem(x, y, weaponName);
        if (this.lootLayer) item.initPixi(this.lootLayer);
        this.items.push(item);
        return item;
    }

    spawnLootItem(x, y, itemName) {
        const item = new LootItem(x, y, itemName);
        if (this.lootLayer) item.initPixi(this.lootLayer);
        this.items.push(item);
        return item;
    }

    spawnCrateLoot(x, y, rarity = 'normal') {
        const isGold = rarity === 'gold';
        const dropCount = isGold ? randomInt(2, 3) : randomInt(1, 2);

        const normalWeapons = [
            'TRUONG_KIEM',
            'THIET_PHIEN'
        ];
        const goldWeapons = [
            'LONG_UYET_DAO',
            'MA_THIEN_THUONG',
            'BACH_HOP_CUNG'
        ];
        const medicines = ['TIEU_HOAN_DAN', 'DAI_HOAN_DAN'];
        const ammos = ['AMMO_TU_TIEN'];

        const spawned = [];
        for (let i = 0; i < dropCount; i++) {
            let itemName;
            if (isGold) {
                if (i === 0) {
                    const rollLeg = Math.random();
                    if (rollLeg < 0.15) {
                        // 15% chance to drop Legendary Anime Weapon
                        itemName = this.legendaryWeapons[randomInt(0, this.legendaryWeapons.length - 1)];
                    } else if (rollLeg < 0.70) {
                        itemName = goldWeapons[randomInt(0, goldWeapons.length - 1)];
                    } else {
                        itemName = 'NHUAN_VI_GIAP';
                    }
                } else if (i === 1) {
                    itemName = Math.random() < 0.5 ? 'DAI_HOAN_DAN' : ammos[randomInt(0, ammos.length - 1)];
                } else {
                    itemName = ammos[randomInt(0, ammos.length - 1)];
                }
            } else {
                const roll = Math.random();
                if (roll < 0.35) {
                    itemName = normalWeapons[randomInt(0, normalWeapons.length - 1)];
                } else if (roll < 0.60) {
                    itemName = medicines[randomInt(0, medicines.length - 1)];
                } else if (roll < 0.75) {
                    itemName = Math.random() < 0.7 ? 'KIM_CHUNG_TRAO' : 'NHUAN_VI_GIAP';
                } else {
                    itemName = ammos[randomInt(0, ammos.length - 1)];
                }
            }

            const ox = x + randomRange(-18, 18);
            const oy = y + randomRange(-18, 18);
            const item = new LootItem(ox, oy, itemName);
            if (this.lootLayer) item.initPixi(this.lootLayer);
            this.items.push(item);
            spawned.push(item);
        }
        return spawned;
    }

    update() {
        for (const item of this.items) {
            item.update();
            if (this.lootLayer) {
                item.updatePixiView();
            }
        }
    }

    draw(ctx, camera) {
        for (const item of this.items) {
            const sx = item.x - camera.x;
            const sy = item.y - camera.y;
            if (sx < -50 || sx > camera.width + 50 || sy < -50 || sy > camera.height + 50) continue;
            item.draw(ctx, camera);
        }
    }

    checkPickup(x, y, radius) {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            const dx = item.x - x;
            const dy = item.y - y;
            if (dx * dx + dy * dy < (radius + item.radius) ** 2) {
                const picked = this.items.splice(i, 1)[0];
                if (picked && typeof picked.destroyPixi === 'function') {
                    picked.destroyPixi();
                }
                return picked;
            }
        }
        return null;
    }
}

