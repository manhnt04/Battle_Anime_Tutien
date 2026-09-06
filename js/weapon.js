import { randomRange, clamp, distance, CONSTANTS, parsePixiColor } from './utils.js';
import { audio } from './audio.js';

function skillCanHit(map, sourceX, sourceY, target) {
    return !map || typeof map.hasLineOfSight !== 'function' ||
        map.hasLineOfSight(sourceX, sourceY, target.x, target.y);
}

export const WEAPONS = {
    QUYEN_CUOC: {
        name: 'QUYỀN CƯỚC',
        en: 'Fists',
        type: 'melee',
        damage: 20,
        range: 40,
        fireRate: 260,
        speedModifier: 1.12,
        color: '#ffecb3',
        icon: '👊',
        tag: '"Thân thủ phiêu dật, quyền xuất phong sinh"',
        rarity: 'common',
        skills: []
    },
    TRUONG_KIEM: {
        name: 'TRƯỜNG KIẾM',
        en: 'Long Sword',
        type: 'melee',
        damage: 25,
        range: 60,
        fireRate: 500,
        speedModifier: 1.05,
        color: '#4aa8ff',
        icon: '⚔️',
        tag: '"Kiếm quang như nước, chiêu thức linh hoạt"',
        rarity: 'common',
        skills: [
            {
                key: 's1',
                name: 'Phong Kiếm Thuấn Bộ',
                cd: 8000,
                sub: 'Kỹ năng 1 (Q)',
                desc: 'Lướt nhanh 100px, 35 sát thương xuyên qua kẻ địch, tạo tàn ảnh xanh',
                damage: 35,
                range: 100
            },
            {
                key: 's2',
                name: 'Kiếm Khí Hộ Thể',
                cd: 15000,
                sub: 'Kỹ năng 2 (E)',
                desc: 'Vòng kiếm khí 3s, giảm 30% sát thương, phản đòn 20 sát thương + đẩy lùi',
                duration: 3000,
                damageReduction: 0.3,
                reflectDamage: 20
            }
        ]
    },
    THIET_PHIEN: {
        name: 'THIẾT PHIẾN',
        en: 'Iron Fan',
        type: 'boomerang',
        damage: 20,
        range: 80,
        fireRate: 600,
        speedModifier: 1.04,
        color: '#ff7a45',
        icon: '🪭',
        tag: '"Quạt sắt vô tình, nhu mì ẩn sát"',
        rarity: 'common',
        skills: [
            {
                key: 's1',
                name: 'Phong Hỏa Liên Thành',
                cd: 10000,
                sub: 'Kỹ năng 1 (Q)',
                desc: 'Vòng lửa 150px trong 3s, 15 sát thương mỗi 0.5s, làm chậm 20%',
                radius: 75,
                duration: 3000,
                damage: 15,
                interval: 500,
                slowPct: 0.2
            },
            {
                key: 's2',
                name: 'Vô Ảnh Phiến',
                cd: 12000,
                sub: 'Kỹ năng 2 (E)',
                desc: 'Ném 3 phiến quạt góc tỏa 45°, 30 sát thương mỗi phiến, tầm 200px',
                count: 3,
                spreadDeg: 45,
                range: 200,
                damage: 30
            }
        ]
    },
    LONG_UYET_DAO: {
        name: 'LONG UYỆT ĐAO',
        en: 'Dragon Crescent Blade',
        type: 'melee',
        damage: 40,
        range: 70,
        fireRate: 800,
        speedModifier: 0.96,
        color: '#f0533b',
        color2: '#f0c419',
        icon: '🗡️',
        tag: '"Đao như mãnh hổ, uy lực kinh thiên"',
        rarity: 'rare',
        knockback: 0.2,
        skills: [
            {
                key: 's1',
                name: 'Long Quyển Phong Bạo',
                cd: 15000,
                sub: 'Kỹ năng 1 (Q)',
                desc: 'Lốc xoáy 100px trong 2s, 20 sát thương mỗi 0.4s, hút địch vào tâm, miễn khống chế',
                radius: 100,
                duration: 2000,
                damage: 20,
                interval: 400
            },
            {
                key: 's2',
                name: 'Uy Long Trảm',
                cd: 18000,
                sub: 'Kỹ năng 2 (E)',
                desc: 'Nhảy nện dậm đất 200px, 60 sát thương vùng, làm choáng 1s',
                radius: 200,
                damage: 60,
                stunMs: 1000
            },
            {
                key: 's3',
                name: 'Huyết Long Hộ Thể',
                cd: 25000,
                sub: 'Tuyệt kỹ (R)',
                desc: '+50% sát thương trong 5s, hút 20% sát thương thành máu, hào quang đỏ rực',
                duration: 5000,
                damageBuff: 0.5,
                lifesteal: 0.2
            }
        ]
    },
    MA_THIEN_THUONG: {
        name: 'MA THIÊN THƯƠNG',
        en: 'Demon Spear',
        type: 'melee',
        damage: 30,
        range: 90,
        fireRate: 600,
        speedModifier: 0.98,
        color: '#8b5cf6',
        color2: '#1a0a2b',
        icon: '🔱',
        tag: '"Thương pháp quỷ dị, xuất quỷ nhập thần"',
        rarity: 'rare',
        skills: [
            {
                key: 's1',
                name: 'Quỷ Ảnh Liên Hoàn Thương',
                cd: 12000,
                sub: 'Kỹ năng 1 (Q)',
                desc: '3 bóng ma thương 150px, mỗi bóng 25 sát thương, giảm 30% giáp 2s',
                range: 150,
                damage: 25,
                count: 3
            },
            {
                key: 's2',
                name: 'Địa Ngục Thương Trận',
                cd: 16000,
                sub: 'Kỹ năng 2 (E)',
                desc: 'Cắm thương tạo vùng lửa đen 120px 4s, 15 sát thương mỗi 0.5s, làm chậm 20%',
                radius: 120,
                duration: 4000,
                damage: 15,
                interval: 500,
                slowPct: 0.2
            },
            {
                key: 's3',
                name: 'Ma Vương Giáng Thế',
                cd: 30000,
                sub: 'Tuyệt kỹ (R)',
                desc: 'Biến thân Ma Vương 6s, gấp đôi sát thương đánh thường, tạo sóng xung kích, miễn khống chế',
                duration: 6000,
                damageMultiplier: 2.0
            }
        ]
    },
    BACH_HOP_CUNG: {
        name: 'BÁCH HỢP CUNG',
        en: 'Lily Bow',
        type: 'ranged',
        ammoType: 'arrows',
        damage: 35,
        range: 500,
        speed: 21,
        magSize: 20,
        reloadTime: 1200,
        fireRate: 700,
        speedModifier: 0.97,
        color: '#4caf6d',
        icon: '🏹',
        tag: '"Cung như trăng khuyết, tên bay vô tận"',
        rarity: 'rare',
        skills: [
            {
                key: 's1',
                name: 'Liên Châu Bạo Vũ',
                cd: 10000,
                sub: 'Kỹ năng 1 (Q)',
                desc: 'Bắn 5 mũi tên nhanh liên tiếp trong 1.5s, 15 sát thương mỗi mũi, tự ngắm đối thủ',
                count: 5,
                damage: 15
            },
            {
                key: 's2',
                name: 'Phong Hỏa Liên Tiễn',
                cd: 14000,
                sub: 'Kỹ năng 2 (E)',
                desc: 'Bắn tên lửa cầu vồng 400px, nổ 45 sát thương, tạo vùng lửa 80px 3s',
                range: 400,
                damage: 45,
                radius: 80,
                duration: 3000
            },
            {
                key: 's3',
                name: 'Thiên Ngoại Phi Tiên',
                cd: 22000,
                sub: 'Tuyệt kỹ (R)',
                desc: 'Mũi tên thần thánh toàn bản đồ, delay 0.5s, gây 70 sát thương cực đại',
                damage: 70,
                delay: 500
            }
        ]
    },

    // ⚔️ 5 ANIME LEGENDARY WEAPONS
    ZANGETSU: {
        name: 'ZANGETSU',
        en: 'Slaying Moon',
        type: 'melee',
        damage: 45,
        range: 75,
        fireRate: 600,
        speedModifier: 1.05,
        color: '#ff1744',
        color2: '#111111',
        icon: '🗡️',
        tag: '"Vũ khí của Tử Thần thay thế, mang sức mạnh của Shinigami"',
        rarity: 'legendary',
        skills: [
            {
                key: 's1',
                name: 'Shunpo (Thuấn Bộ)',
                cd: 8000,
                sub: 'Kỹ năng 1 (Q)',
                desc: 'Dịch chuyển tức thời 150px theo hướng ngắm, tạo tàn ảnh đen 1s'
            },
            {
                key: 's2',
                name: 'Bankai - Tensa Zangetsu',
                cd: 20000,
                sub: 'Kỹ năng 2 (E)',
                desc: 'Biến hình 8s: Tăng 40% tốc độ, đòn đánh biến thành Getsuga Jujishou sát thương 60'
            },
            {
                key: 's3',
                name: 'Mugetsu (Vô Nguyệt)',
                cd: 40000,
                sub: 'Tuyệt kỹ (R)',
                desc: 'Vô Nguyệt 5s: Tăng 200% sát thương, sóng chém 300px. Khi hết nhận 30 phản phệ'
            }
        ]
    },
    ONE_FOR_ALL: {
        name: 'ONE FOR ALL',
        en: 'One For All',
        type: 'melee',
        damage: 50,
        range: 50,
        fireRate: 700,
        speedModifier: 1.08,
        color: '#00e5ff',
        color2: '#00e676',
        icon: '🥊',
        tag: '"Sức mạnh được truyền qua 9 thế hệ, phá vỡ mọi giới hạn"',
        rarity: 'legendary',
        skills: [
            {
                key: 's1',
                name: 'Manchester Smash',
                cd: 10000,
                sub: 'Kỹ năng 1 (Q)',
                desc: 'Nhảy vọt 200px nện gót rìu, 65 sát thương vùng 80px, tạo sóng xung kích'
            },
            {
                key: 's2',
                name: 'Full Cowling',
                cd: 15000,
                sub: 'Kỹ năng 2 (E)',
                desc: 'Toàn thân bao phủ 6s: Tăng 50% tốc độ, +30% sát thương, phóng tia điện xanh'
            },
            {
                key: 's3',
                name: 'United States of Smash',
                cd: 45000,
                sub: 'Tuyệt kỹ (R)',
                desc: 'Cú đấm hủy diệt: 150 sát thương đơn thể + 80 vùng 300px, nhận 50 phản chấn'
            }
        ]
    },
    KATON: {
        name: 'KATON',
        en: 'Copy Ninja Art',
        type: 'ranged',
        ammoType: 'darts',
        damage: 35,
        range: 150,
        speed: 15,
        count: 3,
        spread: 0.22,
        magSize: 30,
        reloadTime: 900,
        fireRate: 550,
        speedModifier: 1.06,
        color: '#40c4ff',
        color2: '#7c4dff',
        icon: '🥷',
        tag: '"Copy Ninja, bậc thầy của ngàn nhẫn thuật Sharingan"',
        rarity: 'legendary',
        skills: [
            {
                key: 's1',
                name: 'Chidori (Thiên Điểu)',
                cd: 10000,
                sub: 'Kỹ năng 1 (Q)',
                desc: 'Lao lôi điện 120px, 70 sát thương xuyên thấu, làm chậm 30% trong 1s'
            },
            {
                key: 's2',
                name: 'Kamui (Thần Uy)',
                cd: 18000,
                sub: 'Kỹ năng 2 (E)',
                desc: 'Xoáy dị không gian 100px hút kẻ địch, gây 40 sát thương và làm choáng 1s'
            },
            {
                key: 's3',
                name: "Susano'o Hoàn Toàn Thể",
                cd: 40000,
                sub: 'Tuyệt kỹ (R)',
                desc: 'Giáp Susanoo 150px: Bất tử 5s, đánh thường 80 sát thương, phát sóng 50 dmg mỗi 2s'
            }
        ]
    },
    EXCALIBUR: {
        name: 'EXCALIBUR',
        en: 'Sword of Promised Victory',
        type: 'melee',
        damage: 40,
        range: 70,
        fireRate: 600,
        speedModifier: 1.04,
        color: '#ffd700',
        color2: '#ffffff',
        icon: '🔮',
        tag: '"Thanh kiếm của vua Arthur, hội tụ sức mạnh của các vị thần"',
        rarity: 'legendary',
        skills: [
            {
                key: 's1',
                name: 'Strike Air (Thiết Chùy)',
                cd: 12000,
                sub: 'Kỹ năng 1 (Q)',
                desc: 'Giải phóng khí nén tạo sóng gió 250px, gây 60 sát thương và đẩy lùi 100px'
            },
            {
                key: 's2',
                name: 'Avalon (Hộ Thân Kiếm)',
                cd: 20000,
                sub: 'Kỹ năng 2 (E)',
                desc: 'Thánh kiếm di vật: Miễn nhiễm mọi sát thương 3s, hồi phục 50 HP'
            },
            {
                key: 's3',
                name: 'EXCALIBUR Quang Kiếm',
                cd: 45000,
                sub: 'Tuyệt kỹ (R)',
                desc: 'Cột sáng hoàng kim 80px x 500px, 150 sát thương quét sạch, hủy diệt chướng ngại vật'
            }
        ]
    },
    GATE_OF_BABYLON: {
        name: 'GATE OF BABYLON',
        en: 'King Treasure',
        type: 'ranged',
        ammoType: 'sword_qi',
        damage: 30,
        range: 400,
        speed: 16,
        magSize: 25,
        reloadTime: 1100,
        fireRate: 750,
        speedModifier: 1.0,
        color: '#ffb300',
        color2: '#d50000',
        icon: '🏹',
        tag: '"Kho báu của vị vua anh hùng, chứa đựng mọi bảo vật thế gian"',
        rarity: 'legendary',
        skills: [
            {
                key: 's1',
                name: 'Triple Gate (Tam Trọng Môn)',
                cd: 10000,
                sub: 'Kỹ năng 1 (Q)',
                desc: 'Mở 3 cổng Babylon bắn 3 vũ khí hình quạt 60°, mỗi bảo khí 40 sát thương'
            },
            {
                key: 's2',
                name: 'Chains of Heaven (Enkidu)',
                cd: 15000,
                sub: 'Kỹ năng 2 (E)',
                desc: 'Xích thần khóa chặt kẻ địch trong 2 giây, gây 25 sát thương, cự ly 200px'
            },
            {
                key: 's3',
                name: 'ENUMA ELISH (Khai Tích)',
                cd: 50000,
                sub: 'Tuyệt kỹ (R)',
                desc: 'Kiếm Ea xé toạc không gian: Vòng xoáy 300px gây 120 dmg, kết thúc nổ 200 sát thương'
            }
        ]
    }
};

// Only canonical weapons are registered. Legacy aliases copied skill metadata
// but had no matching useSkill() implementation, producing dead Q/E/R buttons.
WEAPONS.FISTS = WEAPONS.QUYEN_CUOC;

export class Weapon {
    constructor(name) {
        const config = WEAPONS[name] || WEAPONS.QUYEN_CUOC;
        this.name = config.name || name;
        this.rawKey = name;
        this.en = config.en || '';
        this.type = config.type;
        this.damage = config.damage;
        this.range = config.range;
        this.speed = config.speed || 0;
        this.fireRate = config.fireRate;
        this.lastFireTime = 0;
        this.ammoType = config.ammoType || null;
        this.magSize = config.magSize || 0;
        this.currentAmmo = this.magSize;
        this.reloadTime = config.reloadTime || 1000;
        this.reloading = false;
        this.reloadStartTime = 0;
        this.spread = config.spread || 0;
        this.count = config.count || 1;
        this.speedModifier = config.speedModifier || 1.0;
        this.color = config.color;
        this.color2 = config.color2 || null;
        this.icon = config.icon;
        this.tag = config.tag || '';
        this.rarity = config.rarity || 'common';
        this.skills = config.skills ? config.skills.map(s => ({ ...s })) : [];
        this.combo = 0;
        this.inventory = null;
    }

    canFire() {
        const now = Date.now();
        if (this.reloading) return false;
        if (now - this.lastFireTime < this.fireRate) return false;
        if (this.type === 'ranged' && this.currentAmmo <= 0) return false;
        return true;
    }

    fire(owner = null) {
        if (!this.canFire()) return null;
        const now = Date.now();
        if (now - this.lastFireTime < 1000) {
            this.combo = (this.combo + 1) % 3;
        } else {
            this.combo = 0;
        }
        this.lastFireTime = now;

        if (this.type === 'boomerang') {
            return [{
                type: 'boomerang',
                damage: this.damage,
                range: this.range,
                speed: 12,
                color: this.color,
                weaponName: this.name
            }];
        } else if (this.type === 'ranged') {
            this.currentAmmo--;
            if (this.rawKey === 'KATON') {
                const spreads = [-0.22, 0, 0.22];
                const res = [];
                for (let i = 0; i < spreads.length; i++) {
                    res.push({
                        type: 'projectile',
                        damage: this.damage,
                        speed: this.speed || 16,
                        range: this.range || 250,
                        spread: spreads[i],
                        color: this.color,
                        ammoType: this.ammoType,
                        weaponName: this.name,
                        pierce: 1
                    });
                }
                return res;
            } else if (this.rawKey === 'GATE_OF_BABYLON') {
                return [{
                    type: 'projectile',
                    damage: this.damage,
                    speed: this.speed || 18,
                    range: this.range || 400,
                    spread: randomRange(-0.04, 0.04),
                    color: '#ffd700',
                    ammoType: this.ammoType,
                    weaponName: this.name,
                    pierce: 1,
                    isBabylon: true
                }];
            } else if (this.rawKey === 'KATON') {
                const spreads = [-0.22, 0, 0.22];
                const res = [];
                for (let i = 0; i < spreads.length; i++) {
                    res.push({
                        type: 'projectile',
                        damage: this.damage,
                        speed: this.speed || 15,
                        range: this.range || 150,
                        spread: spreads[i],
                        color: '#c7c9d3',
                        ammoType: 'darts',
                        weaponName: this.name,
                        pierce: 1
                    });
                }
                return res;
            }

            const projectiles = [];
            for (let i = 0; i < this.count; i++) {
                projectiles.push({
                    type: 'projectile',
                    damage: this.damage,
                    speed: this.speed,
                    range: this.range,
                    spread: this.spread,
                    color: this.color,
                    ammoType: this.ammoType,
                    weaponName: this.name,
                    pierce: this.rawKey === 'BACH_HOP_CUNG' ? 2 : 1
                });
            }
            return projectiles;
        } else {
            // Melee weapons
            if (this.rawKey === 'ZANGETSU') {
                let dmg = this.damage;
                let getsugaRange = 200;
                let color = this.color;
                if (owner && owner.buffs) {
                    if (owner.buffs.mugetsu > 0) {
                        dmg = 135; // +200%
                        getsugaRange = 300;
                        color = '#d500f9';
                    } else if (owner.buffs.bankai > 0) {
                        dmg = 60; // Getsuga Jujishou
                        getsugaRange = 240;
                        color = '#ff1744';
                    }
                }
                return [
                    {
                        type: 'melee',
                        damage: dmg,
                        range: this.range,
                        spread: 0,
                        combo: this.combo,
                        weaponName: this.name,
                        rawKey: this.rawKey,
                        color: color
                    },
                    {
                        type: 'projectile',
                        isGetsuga: true,
                        damage: dmg,
                        speed: 18,
                        range: getsugaRange,
                        spread: 0,
                        color: color,
                        ammoType: null,
                        weaponName: this.name,
                        pierce: 999,
                        radius: 12
                    }
                ];
            } else if (this.rawKey === 'ONE_FOR_ALL') {
                let dmg = this.damage;
                if (owner && owner.buffs && owner.buffs.fullCowling > 0) {
                    dmg = 65; // +30%
                }
                return [{
                    type: 'melee',
                    damage: dmg,
                    range: this.range,
                    spread: 0,
                    combo: this.combo,
                    weaponName: this.name,
                    rawKey: this.rawKey,
                    color: this.color,
                    knockback: 0.5,
                    stunChance: 0.3,
                    stunDuration: 500
                }];
            } else if (this.rawKey === 'EXCALIBUR') {
                const res = [{
                    type: 'melee',
                    damage: this.damage,
                    range: 100, // Invisible Air reach
                    spread: 0,
                    combo: this.combo,
                    weaponName: this.name,
                    rawKey: this.rawKey,
                    color: this.color
                }];
                if (Math.random() < 0.2) {
                    res.push({
                        type: 'projectile',
                        damage: 30,
                        speed: 18,
                        range: 200,
                        spread: 0,
                        color: '#e0f7fa',
                        ammoType: null,
                        weaponName: this.name,
                        pierce: 1,
                        radius: 8
                    });
                }
                return res;
            }

            return [{
                type: 'melee',
                damage: this.damage,
                range: this.range,
                spread: 0,
                combo: this.combo,
                weaponName: this.name,
                rawKey: this.rawKey,
                color: this.color
            }];
        }
    }

    useSkill(index, owner, targetPoint, game) {
        if (!this.skills || !this.skills[index]) return null;
        const skill = this.skills[index];

        switch (this.rawKey) {
            case 'TRUONG_KIEM':
                if (index === 0) {
                    const dash = new DashBlinkEffect(owner, 100, 35, '#4aa8ff', game ? game.map : null, game ? game.getTargets() : null, game);
                    if (game && game.activeSkills) game.activeSkills.push(dash);
                    return dash;
                } else if (index === 1) {
                    if (owner && owner.buffs) owner.buffs.bladeShield = 3000;
                    return { type: 'buff', name: 'bladeShield' };
                }
                break;

            case 'THIET_PHIEN':
                if (index === 0) {
                    const tx = targetPoint ? targetPoint.x : (owner.x + Math.cos(owner.angle) * 80);
                    const ty = targetPoint ? targetPoint.y : (owner.y + Math.sin(owner.angle) * 80);
                    const zone = new SkillZone(tx, ty, 75, 3000, 500, 15, 0.2, '#ff7a45', 'fire', owner);
                    if (game && game.skillZones) game.skillZones.push(zone);
                    return zone;
                } else if (index === 1) {
                    const count = 3;
                    const spread = 45 * Math.PI / 180;
                    const fans = [];
                    for (let i = 0; i < count; i++) {
                        const ang = owner.angle - spread / 2 + (i / (count - 1)) * spread;
                        const fan = new BoomerangFan(owner.x, owner.y, owner.x + Math.cos(ang) * 200, owner.y + Math.sin(ang) * 200, ang, 200, 30, owner, '#ff7a45');
                        fans.push(fan);
                        if (game && game.activeSkills) game.activeSkills.push(fan);
                    }
                    return fans;
                }
                break;

            case 'LONG_UYET_DAO':
                if (index === 0) {
                    const tornado = new TornadoEffect(owner, 100, 2000, 20, 400, '#f0533b');
                    if (game && game.activeSkills) game.activeSkills.push(tornado);
                    return tornado;
                } else if (index === 1) {
                    const slam = new LeapSlamEffect(owner, 200, 60, 1000, '#f0533b');
                    if (game && game.activeSkills) game.activeSkills.push(slam);
                    return slam;
                } else if (index === 2) {
                    if (owner && owner.buffs) owner.buffs.bloodAura = 5000;
                    return { type: 'buff', name: 'bloodAura' };
                }
                break;

            case 'MA_THIEN_THUONG':
                if (index === 0) {
                    const ghosts = new GhostThrustEffect(owner, 150, 25, '#8b5cf6', game ? game.getTargets() : null, game);
                    if (game && game.activeSkills) game.activeSkills.push(ghosts);
                    return ghosts;
                } else if (index === 1) {
                    const zone = new SkillZone(owner.x, owner.y, 120, 4000, 500, 15, 0.2, '#8b5cf6', 'hell', owner);
                    if (game && game.skillZones) game.skillZones.push(zone);
                    return zone;
                } else if (index === 2) {
                    if (owner && owner.buffs) owner.buffs.demonForm = 6000;
                    return { type: 'buff', name: 'demonForm' };
                }
                break;

            case 'BACH_HOP_CUNG':
                if (index === 0) {
                    if (game && typeof game.fireRapidVolley === 'function') {
                        game.fireRapidVolley(owner, 5, 15, '#4caf6d');
                    }
                    return { type: 'rapid_volley', count: 5 };
                } else if (index === 1) {
                    const tx = targetPoint ? targetPoint.x : (owner.x + Math.cos(owner.angle) * 350);
                    const ty = targetPoint ? targetPoint.y : (owner.y + Math.sin(owner.angle) * 350);
                    const arcArrow = new FireArrowArcEffect(owner.x, owner.y, tx, ty, 45, 80, 650, owner, '#ff7a45');
                    if (game && game.activeSkills) game.activeSkills.push(arcArrow);
                    return arcArrow;
                } else if (index === 2) {
                    const tx = targetPoint ? targetPoint.x : (owner.x + Math.cos(owner.angle) * 300);
                    const ty = targetPoint ? targetPoint.y : (owner.y + Math.sin(owner.angle) * 300);
                    const sky = new SkyfallEffect(tx, ty, 70, 500, owner, '#4caf6d');
                    if (game && game.activeSkills) game.activeSkills.push(sky);
                    return sky;
                }
                break;

            case 'ZANGETSU':
                if (index === 0) {
                    const targetX = targetPoint ? targetPoint.x : owner.x + Math.cos(owner.angle) * 150;
                    const targetY = targetPoint ? targetPoint.y : owner.y + Math.sin(owner.angle) * 150;
                    const ang = Math.atan2(targetY - owner.y, targetX - owner.x);
                    const oldX = owner.x;
                    const oldY = owner.y;
                    let dist = Math.min(150, Math.hypot(targetX - owner.x, targetY - owner.y) || 150);
                    let newX = owner.x + Math.cos(ang) * dist;
                    let newY = owner.y + Math.sin(ang) * dist;
                    const mapW = (game && game.map && game.map.width) ? game.map.width : 3000;
                    const mapH = (game && game.map && game.map.height) ? game.map.height : 3000;
                    newX = clamp(newX, 30, mapW - 30);
                    newY = clamp(newY, 30, mapH - 30);
                    owner.x = newX;
                    owner.y = newY;
                    const shunpo = new ShunpoEffect(oldX, oldY, newX, newY, owner.angle, 1000, '#ff1744');
                    if (game && game.activeSkills) game.activeSkills.push(shunpo);
                    if (game && game.particles) game.particles.burst(newX, newY, '#ff1744', 15);
                    audio.playShunpo();
                    return shunpo;
                } else if (index === 1) {
                    if (owner && owner.buffs) {
                        owner.buffs.bankai = 8000;
                    }
                    audio.playBankai();
                    if (game && game.particles) game.particles.burst(owner.x, owner.y, '#ff1744', 25);
                    if (typeof window !== 'undefined' && window.ui && typeof window.ui.addNotification === 'function') {
                        window.ui.addNotification('🗡️ BANKAI: TENSA ZANGETSU! Tốc độ +40%, Đòn đánh Getsuga Jujishou (60 ST)!', 'warning');
                    }
                    return { type: 'buff', name: 'bankai' };
                } else if (index === 2) {
                    if (owner && owner.buffs) {
                        owner.buffs.mugetsu = 5000;
                    }
                    if (owner && typeof owner.takeDamage === 'function') {
                        owner.health = Math.max(1, owner.health - 30);
                    }
                    audio.playMugetsu();
                    const wave = new MugetsuWaveEffect(owner.x, owner.y, owner.angle, 350, 120, 80, owner, '#111111');
                    if (game && game.activeSkills) game.activeSkills.push(wave);
                    if (game && game.camera && game.screenShakeEnabled) game.camera.addShake(12);
                    if (typeof window !== 'undefined' && window.ui && typeof window.ui.addNotification === 'function') {
                        window.ui.addNotification('⚡ VÔ NGUYỆT (MUGETSU)! Sát thương +200%, Sóng chém cực đại!', 'error');
                    }
                    return wave;
                }
                break;

            case 'ONE_FOR_ALL':
                if (index === 0) {
                    const tx = targetPoint ? targetPoint.x : owner.x + Math.cos(owner.angle) * 160;
                    const ty = targetPoint ? targetPoint.y : owner.y + Math.sin(owner.angle) * 160;
                    const smash = new ManchesterSmashEffect(owner, tx, ty, 65, 80, 400, '#00e5ff');
                    if (game && game.activeSkills) game.activeSkills.push(smash);
                    audio.playSmash();
                    return smash;
                } else if (index === 1) {
                    if (owner && owner.buffs) {
                        owner.buffs.fullCowling = 6000;
                    }
                    audio.playFullCowling();
                    if (game && game.particles) game.particles.burst(owner.x, owner.y, '#00e5ff', 25);
                    if (typeof window !== 'undefined' && window.ui && typeof window.ui.addNotification === 'function') {
                        window.ui.addNotification('⚡ ONE FOR ALL: FULL COWLING 20%! Tốc độ +50%, Sát thương +30%!', 'warning');
                    }
                    return { type: 'buff', name: 'fullCowling' };
                } else if (index === 2) {
                    const us = new UnitedStatesSmashEffect(owner, 150, 80, 300, 50, game);
                    if (game && game.activeSkills) game.activeSkills.push(us);
                    audio.playUnitedStates();
                    if (game) game.screenDarkenTimer = 1000;
                    if (game && game.camera && game.screenShakeEnabled) game.camera.addShake(15);
                    if (typeof window !== 'undefined' && window.ui && typeof window.ui.addNotification === 'function') {
                        window.ui.addNotification('💥 UNITED STATES OF SMASHHH!!! Đòn đấm tối thượng 150 ST!', 'error');
                    }
                    return us;
                }
                break;

            case 'KATON':
                if (index === 0) {
                    const chidori = new ChidoriDashEffect(owner, 120, 70, 0.3, 1000, '#40c4ff', game);
                    if (game && game.activeSkills) game.activeSkills.push(chidori);
                    audio.playChidori();
                    return chidori;
                } else if (index === 1) {
                    const tx = targetPoint ? targetPoint.x : owner.x + Math.cos(owner.angle) * 180;
                    const ty = targetPoint ? targetPoint.y : owner.y + Math.sin(owner.angle) * 180;
                    const kamui = new KamuiVortexEffect(tx, ty, 100, 40, 1500, 1000, owner, '#7c4dff');
                    if (game && game.activeSkills) game.activeSkills.push(kamui);
                    audio.playKamui();
                    return kamui;
                } else if (index === 2) {
                    if (owner && owner.buffs) {
                        owner.buffs.susanoo = 5000;
                        owner.buffs.susanooPulseTimer = 0;
                    }
                    const susanoo = new SusanooAuraEffect(owner, 150, 5000, 50, 2000, '#00b0ff');
                    if (game && game.activeSkills) game.activeSkills.push(susanoo);
                    audio.playSusanoo();
                    if (typeof window !== 'undefined' && window.ui && typeof window.ui.addNotification === 'function') {
                        window.ui.addNotification("🛡️ SUSANO'O HOÀN TOÀN THỂ! Bất tử 5s, Chém 80 ST, Xung kích 50 AoE!", 'warning');
                    }
                    return susanoo;
                }
                break;

            case 'EXCALIBUR':
                if (index === 0) {
                    const strikeAir = new StrikeAirEffect(owner, 250, 60, 100, '#ffd700');
                    if (game && game.activeSkills) game.activeSkills.push(strikeAir);
                    audio.playExcalibur();
                    return strikeAir;
                } else if (index === 1) {
                    if (owner && owner.buffs) {
                        owner.buffs.avalon = 3000;
                    }
                    owner.heal(50);
                    audio.playHolyBarrier();
                    if (game && game.particles) game.particles.burst(owner.x, owner.y, '#ffd700', 30);
                    if (typeof window !== 'undefined' && window.ui && typeof window.ui.addNotification === 'function') {
                        window.ui.addNotification('✨ AVALON: BẤT TỬ 3 GIÂY & HỒI PHỤC 50 KHÍ HUYẾT!', 'success');
                    }
                    return { type: 'buff', name: 'avalon' };
                } else if (index === 2) {
                    const beam = new ExcaliburBeamEffect(owner, 500, 80, 150, '#ffd700', game);
                    if (game && game.activeSkills) game.activeSkills.push(beam);
                    audio.playExcalibur();
                    if (game) game.screenFlashTimer = 800;
                    if (game && game.camera && game.screenShakeEnabled) game.camera.addShake(14);
                    if (typeof window !== 'undefined' && window.ui && typeof window.ui.addNotification === 'function') {
                        window.ui.addNotification('🌟 EX---CALIBURRRRR!!! Thánh quang 150 ST quét sạch mọi vật cản!', 'error');
                    }
                    return beam;
                }
                break;

            case 'GATE_OF_BABYLON':
                if (index === 0) {
                    const triple = new TripleGateEffect(owner, 450, 40, '#ffd700', game);
                    if (game && game.activeSkills) game.activeSkills.push(triple);
                    audio.playBabylonGate();
                    return triple;
                } else if (index === 1) {
                    const tx = targetPoint ? targetPoint.x : owner.x + Math.cos(owner.angle) * 180;
                    const ty = targetPoint ? targetPoint.y : owner.y + Math.sin(owner.angle) * 180;
                    const enkidu = new EnkiduChainEffect(owner, tx, ty, 200, 25, 2000, '#ffd700');
                    if (game && game.activeSkills) game.activeSkills.push(enkidu);
                    audio.playEnkidu();
                    return enkidu;
                } else if (index === 2) {
                    const tx = targetPoint ? targetPoint.x : owner.x + Math.cos(owner.angle) * 220;
                    const ty = targetPoint ? targetPoint.y : owner.y + Math.sin(owner.angle) * 220;
                    const ea = new EnumaElishVortexEffect(tx, ty, 150, 120, 200, 3000, owner, '#d50000', game);
                    if (game && game.activeSkills) game.activeSkills.push(ea);
                    audio.playEnumaElish();
                    if (game && game.camera && game.screenShakeEnabled) game.camera.addShake(16);
                    if (typeof window !== 'undefined' && window.ui && typeof window.ui.addNotification === 'function') {
                        window.ui.addNotification('🌌 ENUMA ELISH: KHAI THIÊN LẬP ĐỊA! Xoáy không gian 120 ST + Nổ 200 ST!', 'error');
                    }
                    return ea;
                }
                break;
        }
        return null;
    }

    update() {
        if (this.reloading && Date.now() - this.reloadStartTime >= this.reloadTime) {
            this.finishReload();
        }
    }

    finishReload() {
        if (!this.reloading) return;
        this.reloading = false;
        if (this.inventory && this.ammoType) {
            const needed = this.magSize - this.currentAmmo;
            const available = this.inventory.getAmmoCount(this.ammoType);
            const take = Math.min(needed, available);
            this.currentAmmo += take;
            this.inventory.consumeAmmo(this.ammoType, take);
        } else {
            this.currentAmmo = this.magSize;
        }
    }

    getAmmoString() {
        if (this.type === 'melee' || this.type === 'boomerang') return 'VÔ HẠN';
        if (this.reloading) return 'VẬN KHÍ...';
        const reserve = this.inventory ? this.inventory.getAmmoCount(this.ammoType) : 0;
        return `${this.currentAmmo} / ${reserve}`;
    }
}

export class Inventory {
    constructor() {
        this.slots = 5;
        this.weapons = [new Weapon('QUYEN_CUOC'), null, null, null, null];
        this.weapons[0].inventory = this;
        this.currentSlot = 0;
        this.ammo = {
            needles: 20,
            arrows: 40,
            sword_qi: 10,
            darts: 60,
            shells: 20,
            heavy: 40,
            sniper: 10,
            light: 60
        };
    }

    getAmmoCount(type) {
        const canonical = this.canonicalAmmoType(type);
        return this.ammo[canonical] || 0;
    }

    consumeAmmo(type, amount) {
        const canonical = this.canonicalAmmoType(type);
        if (this.ammo[canonical] !== undefined) {
            this.ammo[canonical] = Math.max(0, this.ammo[canonical] - amount);
        }
    }

    canonicalAmmoType(type) {
        if (type === 'shells' || type === 'needles') return 'needles';
        if (type === 'heavy' || type === 'arrows') return 'arrows';
        if (type === 'sniper' || type === 'sword_qi') return 'sword_qi';
        if (type === 'light' || type === 'darts') return 'darts';
        return type;
    }

    getCurrentWeapon() {
        return this.weapons[this.currentSlot];
    }

    setSingleWeapon(name) {
        const curWeapon = this.getCurrentWeapon();
        let droppedKey = null;
        if (curWeapon && curWeapon.rawKey !== 'QUYEN_CUOC' && curWeapon.rawKey !== 'FISTS') {
            droppedKey = curWeapon.rawKey;
        }

        const weapon = new Weapon(name);
        weapon.inventory = this;
        this.weapons[0] = weapon;
        this.currentSlot = 0;
        for (let i = 1; i < this.weapons.length; i++) {
            this.weapons[i] = null;
        }
        if (weapon.ammoType && weapon.magSize) {
            this.addAmmo(weapon.ammoType, weapon.magSize * 2);
        }
        return droppedKey;
    }

    switchToSlot(index) {
        if (index < 0 || index >= this.slots) return false;
        if (this.weapons[index]) {
            this.currentSlot = index;
            return true;
        }
        return false;
    }

    addWeapon(name) {
        const weapon = new Weapon(name);
        weapon.inventory = this;

        for (let i = 0; i < this.slots; i++) {
            if (this.weapons[i] && (this.weapons[i].name === weapon.name || this.weapons[i].rawKey === name)) {
                if (weapon.ammoType) {
                    this.addAmmo(weapon.ammoType, weapon.magSize * 2);
                }
                this.currentSlot = i;
                return { success: true, slot: i };
            }
        }

        for (let i = 1; i < this.slots; i++) {
            if (!this.weapons[i]) {
                this.weapons[i] = weapon;
                this.currentSlot = i;
                return { success: true, slot: i };
            }
        }

        const targetSlot = this.currentSlot === 0 ? 1 : this.currentSlot;
        this.weapons[targetSlot] = weapon;
        this.currentSlot = targetSlot;
        return { success: true, slot: targetSlot };
    }

    addAmmo(type, amount) {
        const canonical = this.canonicalAmmoType(type);
        if (this.ammo[canonical] !== undefined) {
            this.ammo[canonical] += amount;
        } else {
            this.ammo[canonical] = amount;
        }
    }

    canReload() {
        const weapon = this.getCurrentWeapon();
        if (!weapon || weapon.type !== 'ranged' || weapon.reloading) return false;
        if (weapon.currentAmmo >= weapon.magSize) return false;
        return this.getAmmoCount(weapon.ammoType) > 0;
    }

    reload() {
        const weapon = this.getCurrentWeapon();
        if (!weapon || !this.canReload()) return false;
        weapon.reloading = true;
        weapon.reloadStartTime = Date.now();
        return true;
    }
}

export class Projectile {
    constructor(x, y, angle, data, owner) {
        this.active = true;
        this.init(x, y, angle, data, owner);
    }

    init(x, y, angle, data, owner) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = data ? (data.speed || 16) : 16;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.damage = data ? (data.damage || 20) : 20;
        this.range = data ? (data.range || 600) : 600;
        this.color = data ? (data.color || '#00e5ff') : '#00e5ff';
        this.ammoType = data ? (data.ammoType || 'darts') : 'darts';
        this.radius = data && data.radius ? data.radius : (this.ammoType === 'needles' ? 2 : 4);
        this.owner = owner;
        this.pierce = data ? (data.pierce || 0) : 0;
        this.isGetsuga = data ? !!data.isGetsuga : false;
        this.isBabylon = data ? !!data.isBabylon : false;
        this.piercedTargets = new Set();
        this.alive = true;
        this.active = true;
        this.distanceTraveled = 0;
        this.spin = randomRange(0, Math.PI * 2);
    }

    update() {
        if (!this.active) return;
        this.x += this.vx;
        this.y += this.vy;
        this.distanceTraveled += this.speed;
        this.spin += 0.25;
        if (this.distanceTraveled >= this.range) {
            this.alive = false;
            this.active = false;
        }
    }

    draw(ctx, camera) {
        if (!this.active) return;
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;

        if (this.isGetsuga) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 4;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.arc(sx, sy, 16, this.angle - Math.PI / 2.2, this.angle + Math.PI / 2.2);
            ctx.stroke();

            ctx.strokeStyle = '#111111';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx - this.vx * 0.4, sy - this.vy * 0.4, 14, this.angle - Math.PI / 2.2, this.angle + Math.PI / 2.2);
            ctx.stroke();
        } else if (this.isBabylon) {
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx - this.vx * 1.6, sy - this.vy * 1.6);
            ctx.stroke();
        } else if (this.ammoType === 'sword_qi') {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(sx, sy, 12, this.angle - Math.PI / 3, this.angle + Math.PI / 3);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(sx, sy, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(224, 64, 251, 0.4)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx - this.vx * 1.8, sy - this.vy * 1.8);
            ctx.stroke();
        } else if (this.ammoType === 'needles') {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx - this.vx * 0.8, sy - this.vy * 0.8);
            ctx.stroke();
        } else if (this.ammoType === 'darts') {
            ctx.fillStyle = this.color;
            ctx.translate(sx, sy);
            ctx.rotate(this.spin);
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                ctx.rotate(Math.PI / 2);
                ctx.lineTo(0, -6);
                ctx.lineTo(2, -2);
            }
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx - this.vx * 1.4, sy - this.vy * 1.4);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawPixi(g) {
        if (!this.active || !g) return;
        const colNum = parsePixiColor(this.color || '#00e5ff').color;

        if (this.isGetsuga) {
            g.arc(this.x, this.y, 16, this.angle - Math.PI / 2.2, this.angle + Math.PI / 2.2)
             .stroke({ color: colNum, width: 4, alpha: 0.95 });
            g.arc(this.x - this.vx * 0.4, this.y - this.vy * 0.4, 14, this.angle - Math.PI / 2.2, this.angle + Math.PI / 2.2)
             .stroke({ color: 0x111111, width: 2, alpha: 0.85 });
        } else if (this.isBabylon) {
            g.circle(this.x, this.y, 4.5).fill({ color: 0xffd700, alpha: 1 });
            g.moveTo(this.x, this.y)
             .lineTo(this.x - this.vx * 1.6, this.y - this.vy * 1.6)
             .stroke({ color: 0xffd700, width: 2.5, alpha: 0.85 });
        } else if (this.ammoType === 'sword_qi') {
            g.arc(this.x, this.y, 12, this.angle - Math.PI / 3, this.angle + Math.PI / 3)
             .stroke({ color: colNum, width: 4, alpha: 0.95 });
            g.circle(this.x, this.y, 3).fill({ color: 0xffffff, alpha: 1 });
            g.moveTo(this.x, this.y)
             .lineTo(this.x - this.vx * 1.8, this.y - this.vy * 1.8)
             .stroke({ color: 0xe040fb, width: 3, alpha: 0.4 });
        } else if (this.ammoType === 'needles') {
            g.moveTo(this.x, this.y)
             .lineTo(this.x - this.vx * 0.8, this.y - this.vy * 0.8)
             .stroke({ color: 0xffffff, width: 2, alpha: 0.9 });
        } else if (this.ammoType === 'darts') {
            g.circle(this.x, this.y, 4).fill({ color: colNum, alpha: 0.95 });
            g.circle(this.x, this.y, 2).fill({ color: 0xffffff, alpha: 1 });
        } else {
            g.circle(this.x, this.y, this.radius).fill({ color: colNum, alpha: 1 });
            g.moveTo(this.x, this.y)
             .lineTo(this.x - this.vx * 1.4, this.y - this.vy * 1.4)
             .stroke({ color: colNum, width: 2, alpha: 0.8 });
        }
    }
}


export class ProjectilePool {
    constructor(size = 120) {
        this.size = size;
        this.pool = new Array(size);
        for (let i = 0; i < size; i++) {
            this.pool[i] = new Projectile(0, 0, 0, null, null);
            this.pool[i].active = false;
            this.pool[i].alive = false;
        }
        this.nextIndex = 0;
    }

    clear() {
        for (let i = 0; i < this.size; i++) {
            this.pool[i].active = false;
            this.pool[i].alive = false;
        }
    }

    spawn(x, y, angle, data, owner) {
        for (let i = 0; i < this.size; i++) {
            const idx = (this.nextIndex + i) % this.size;
            if (!this.pool[idx].active) {
                this.nextIndex = (idx + 1) % this.size;
                this.pool[idx].init(x, y, angle, data, owner);
                return this.pool[idx];
            }
        }
        const idx = this.nextIndex;
        this.nextIndex = (this.nextIndex + 1) % this.size;
        this.pool[idx].init(x, y, angle, data, owner);
        return this.pool[idx];
    }
}

export class MeleeAttack {
    constructor(x, y, angle, range, arc, damage, owner, color = null) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.range = range;
        this.arc = arc;
        this.damage = damage;
        this.owner = owner;
        this.color = color || (owner && owner.color ? owner.color : '#00e5ff');
        this.duration = 160;
        this.startTime = Date.now();
        this.alive = true;
        this.hitTargets = new Set();
    }

    update() {
        if (Date.now() - this.startTime >= this.duration) {
            this.alive = false;
        }
    }

    checkHit(target) {
        if (this.hitTargets.has(target)) return false;
        const tx = target.centerX !== undefined ? target.centerX : target.x;
        const ty = target.centerY !== undefined ? target.centerY : target.y;
        const trad = target.radius !== undefined ? target.radius : 15;
        const dx = tx - this.owner.x;
        const dy = ty - this.owner.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this.range + trad) return false;

        const targetAngle = Math.atan2(dy, dx);
        let diff = Math.abs(targetAngle - this.angle);
        while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);

        if (diff <= this.arc / 2) {
            this.hitTargets.add(target);
            return true;
        }
        return false;
    }

    draw(ctx, camera) {
        const sx = this.owner.x - camera.x;
        const sy = this.owner.y - camera.y;
        const elapsed = Date.now() - this.startTime;
        const progress = Math.min(1, elapsed / this.duration);
        const alpha = (1 - progress);

        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = alpha * 0.9;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 14;
        ctx.lineWidth = 5 * (1 - progress * 0.5);
        ctx.beginPath();
        ctx.arc(
            sx,
            sy,
            this.range * (0.6 + progress * 0.4),
            this.angle - this.arc / 2,
            this.angle + this.arc / 2
        );
        ctx.stroke();

        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
            sx,
            sy,
            this.range * (0.5 + progress * 0.35),
            this.angle - this.arc / 2.5,
            this.angle + this.arc / 2.5
        );
        ctx.stroke();

        ctx.restore();
    }

    drawPixi(g, playerX, playerY) {
        if (!g) return;
        const elapsed = Date.now() - this.startTime;
        const progress = Math.min(1, elapsed / this.duration);
        const alpha = (1 - progress) * 0.9;
        if (alpha <= 0) return;

        const colNum = parsePixiColor(this.color || '#4aa8ff').color;
        const currentR = this.range * (0.6 + progress * 0.4);
        const startAng = this.angle - this.arc / 2;
        const endAng = this.angle + this.arc / 2;

        g.arc(0, 0, currentR, startAng, endAng)
         .stroke({ color: colNum, width: 5 * (1 - progress * 0.5), alpha });

        g.arc(0, 0, this.range * (0.5 + progress * 0.35), this.angle - this.arc / 2.5, this.angle + this.arc / 2.5)
         .stroke({ color: 0xffd700, width: 2, alpha: alpha * 0.8 });
    }
}


export class BoomerangFan {
    constructor(originX, originY, targetX, targetY, angle, maxDist, damage, owner, color = '#ff7a45') {
        this.owner = owner;
        this.startX = originX;
        this.startY = originY;
        this.angle = angle;
        this.maxDist = maxDist || 100;
        this.damage = damage || 20;
        this.color = color;
        this.duration = 650;
        this.elapsed = 0;
        this.x = originX;
        this.y = originY;
        this.radius = 12;
        this.alive = true;
        this.active = true;
        this.hitPhase1 = new Set();
        this.hitPhase2 = new Set();
    }

    update(dt, targets, map, game) {
        if (!this.alive) return;
        this.elapsed += dt;
        const p = Math.min(1, this.elapsed / this.duration);
        const go = p < 0.5;
        const pp = go ? p / 0.5 : (1 - p) / 0.5;
        const currentHitSet = go ? this.hitPhase1 : this.hitPhase2;

        const ownerX = this.owner ? this.owner.x : this.startX;
        const ownerY = this.owner ? this.owner.y : this.startY;

        this.x = ownerX + Math.cos(this.angle) * this.maxDist * pp;
        this.y = ownerY + Math.sin(this.angle) * this.maxDist * pp;

        // Hit check on targets
        if (targets) {
            for (let i = 0; i < targets.length; i++) {
                const t = targets[i];
                if (t && t.alive && t !== this.owner && !currentHitSet.has(t)) {
                    const dx = t.x - this.x;
                    const dy = t.y - this.y;
                    if (dx * dx + dy * dy < (t.radius + this.radius) ** 2) {
                        currentHitSet.add(t);
                        if (!skillCanHit(map, this.x, this.y, t)) continue;
                        t.takeDamage(this.damage);
                        if (game && game.particles) game.particles.hit(t.x, t.y, this.color);
                        if (t.health <= 0 && game && typeof game.playerDied === 'function') {
                            game.playerDied(t, this.owner);
                        }
                    }
                }
            }
        }

        // Hit check on breakable crates
        if (map && typeof map.findCrateAt === 'function') {
            const crate = map.findCrateAt(this.x, this.y, this.radius);
            if (crate && crate.alive && !currentHitSet.has(crate)) {
                currentHitSet.add(crate);
                const broken = crate.takeDamage(this.damage);
                if (game && game.particles) game.particles.woodSplinter(crate.centerX, crate.centerY, false);
                if (broken && game && typeof map.destroyCrate === 'function') {
                    map.destroyCrate(crate, game.lootManager, game.particles, null);
                }
            }
        }

        if (this.elapsed >= this.duration) {
            this.alive = false;
            this.active = false;
        }
    }

    draw(ctx, camera) {
        if (!this.alive) return;
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(this.elapsed * 0.025);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.arc(0, 0, 14, Math.PI * 0.8, Math.PI * 2.2);
        ctx.fill();
        ctx.restore();
    }

    drawPixi(g) {
        if (!this.alive || !g) return;
        const colNum = parsePixiColor(this.color || '#ff7a45').color;
        const rot = this.elapsed * 0.025;
        // Draw rotating fan arc around (this.x, this.y)
        g.arc(this.x, this.y, 14, rot + Math.PI * 0.8, rot + Math.PI * 2.2)
         .stroke({ color: colNum, width: 4, alpha: 0.95 });
        g.circle(this.x, this.y, 4).fill({ color: 0xffffff, alpha: 1 });
    }
}


export class SkillZone {
    constructor(x, y, radius, duration, interval, damage, slowPct, color, type, owner) {
        this.x = x;
        this.y = y;
        this.radius = radius || 75;
        this.duration = duration || 3000;
        this.interval = interval || 500;
        this.damage = damage || 15;
        this.slowPct = slowPct || 0.2;
        this.color = color || '#ff7a45';
        this.type = type || 'fire';
        this.owner = owner;
        this.elapsed = 0;
        this.lastTick = 0;
        this.alive = true;
    }

    update(dt, targets, map, game) {
        if (!this.alive) return;
        this.elapsed += dt;

        const isTick = (this.elapsed - this.lastTick >= this.interval);
        if (isTick) {
            this.lastTick = this.elapsed;
        }

        if (targets) {
            for (let i = 0; i < targets.length; i++) {
                const t = targets[i];
                if (t && t.alive && t !== this.owner) {
                    const dx = t.x - this.x;
                    const dy = t.y - this.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 <= (this.radius + t.radius) ** 2) {
                        if (typeof t.applySlow === 'function') {
                            t.applySlow(this.slowPct, 300);
                        }
                        if (isTick) {
                            if (!skillCanHit(map, this.x, this.y, t)) continue;
                            t.takeDamage(this.damage);
                            if (game && game.particles) game.particles.hit(t.x, t.y, this.color);
                            if (t.health <= 0 && game && typeof game.playerDied === 'function') {
                                game.playerDied(t, this.owner);
                            }
                        }
                    }
                }
            }
        }

        if (isTick && map && typeof map.getNearbyObstacles === 'function') {
            const nearby = map.getNearbyObstacles(this.x - this.radius, this.y - this.radius, this.x + this.radius, this.y + this.radius);
            for (let o = 0; o < nearby.length; o++) {
                const obs = nearby[o];
                if (obs.subtype === 'crate' && obs.alive) {
                    const dx = obs.centerX - this.x;
                    const dy = obs.centerY - this.y;
                    if (dx * dx + dy * dy <= (this.radius + obs.radius) ** 2) {
                        const broken = obs.takeDamage(this.damage);
                        if (broken && game && typeof map.destroyCrate === 'function') {
                            map.destroyCrate(obs, game.lootManager, game.particles, null);
                        }
                    }
                }
            }
        }

        if (this.elapsed >= this.duration) {
            this.alive = false;
        }
    }

    draw(ctx, camera) {
        if (!this.alive) return;
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        const pulse = 0.5 + 0.3 * Math.sin(this.elapsed * 0.01);

        ctx.save();
        ctx.translate(sx, sy);
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 18;

        ctx.fillStyle = this.type === 'hell' ? 'rgba(139, 92, 246, 0.16)' : 'rgba(255, 122, 69, 0.16)';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5 + pulse;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    drawPixi(g) {
        if (!this.alive || !g) return;
        const colNum = parsePixiColor(this.color || '#ff7a45').color;
        const pulse = 0.5 + 0.3 * Math.sin(this.elapsed * 0.01);
        const fillAlpha = (this.type === 'hell' ? 0.16 : 0.18) * pulse;

        g.circle(this.x, this.y, this.radius)
         .fill({ color: colNum, alpha: fillAlpha });
        g.circle(this.x, this.y, this.radius)
         .stroke({ color: colNum, width: 2.5 + pulse, alpha: 0.85 });
    }
}


export class TornadoEffect {
    constructor(owner, radius = 100, duration = 2000, damage = 20, interval = 400, color = '#f0533b') {
        this.owner = owner;
        this.radius = radius;
        this.duration = duration;
        this.damage = damage;
        this.interval = interval;
        this.color = color;
        this.elapsed = 0;
        this.lastTick = 0;
        this.alive = true;
    }

    update(dt, targets, map, game) {
        if (!this.alive || !this.owner || !this.owner.alive) {
            this.alive = false;
            return;
        }
        this.elapsed += dt;
        if (this.owner.buffs) this.owner.buffs.ccImmune = 200;

        const isTick = (this.elapsed - this.lastTick >= this.interval);
        if (isTick) this.lastTick = this.elapsed;

        if (targets) {
            for (let i = 0; i < targets.length; i++) {
                const t = targets[i];
                if (t && t.alive && t !== this.owner) {
                    const dx = this.owner.x - t.x;
                    const dy = this.owner.y - t.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < this.radius && dist > 10) {
                        const pullForce = 1.4;
                        t.vx += (dx / dist) * pullForce;
                        t.vy += (dy / dist) * pullForce;

                        if (isTick) {
                            if (!skillCanHit(map, this.x, this.y, t)) continue;
                            t.takeDamage(this.damage);
                            if (game && game.particles) game.particles.hit(t.x, t.y, this.color);
                            if (t.health <= 0 && game && typeof game.playerDied === 'function') {
                                game.playerDied(t, this.owner);
                            }
                        }
                    }
                }
            }
        }

        if (this.elapsed >= this.duration) {
            this.alive = false;
        }
    }

    draw(ctx, camera) {
        if (!this.alive || !this.owner) return;
        const sx = this.owner.x - camera.x;
        const sy = this.owner.y - camera.y;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 20;

        for (let i = 0; i < 3; i++) {
            const rot = this.elapsed * 0.012 + i * (Math.PI * 2 / 3);
            const r = this.radius * (0.35 + 0.65 * ((this.elapsed % 600) / 600));
            ctx.beginPath();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.arc(0, 0, r, rot, rot + 1.6);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawPixi(g) {
        if (!this.alive || !this.owner || !g) return;
        const colNum = parsePixiColor(this.color || '#f0533b').color;
        for (let i = 0; i < 3; i++) {
            const rot = this.elapsed * 0.012 + i * (Math.PI * 2 / 3);
            const r = this.radius * (0.35 + 0.65 * ((this.elapsed % 600) / 600));
            g.arc(this.owner.x, this.owner.y, r, rot, rot + 1.6)
             .stroke({ color: colNum, width: 3, alpha: 0.85 });
        }
    }
}


export class LeapSlamEffect {
    constructor(owner, radius = 200, damage = 60, stunMs = 1000, color = '#f0533b') {
        this.owner = owner;
        this.radius = radius;
        this.damage = damage;
        this.stunMs = stunMs;
        this.color = color;
        this.duration = 850;
        this.elapsed = 0;
        this.slammed = false;
        this.alive = true;
        this.slamX = owner ? owner.x : 0;
        this.slamY = owner ? owner.y : 0;
    }

    update(dt, targets, map, game) {
        if (!this.alive) return;
        this.elapsed += dt;
        const p = this.elapsed / this.duration;

        if (p < 0.4 && this.owner) {
            this.slamX = this.owner.x;
            this.slamY = this.owner.y;
        } else if (!this.slammed) {
            this.slammed = true;
            if (targets) {
                for (let i = 0; i < targets.length; i++) {
                    const t = targets[i];
                    if (t && t.alive && t !== this.owner) {
                        const dx = t.x - this.slamX;
                        const dy = t.y - this.slamY;
                        if (dx * dx + dy * dy <= (this.radius + t.radius) ** 2) {
                            if (!skillCanHit(map, this.slamX, this.slamY, t)) continue;
                            t.takeDamage(this.damage);
                            if (typeof t.applyStun === 'function') {
                                t.applyStun(this.stunMs);
                            }
                            if (game && game.particles) game.particles.hit(t.x, t.y, this.color);
                            if (t.health <= 0 && game && typeof game.playerDied === 'function') {
                                game.playerDied(t, this.owner);
                            }
                        }
                    }
                }
            }

            if (map && typeof map.getNearbyObstacles === 'function') {
                const nearby = map.getNearbyObstacles(this.slamX - this.radius, this.slamY - this.radius, this.slamX + this.radius, this.slamY + this.radius);
                for (let o = 0; o < nearby.length; o++) {
                    const obs = nearby[o];
                    if (obs.subtype === 'crate' && obs.alive) {
                        const dx = obs.centerX - this.slamX;
                        const dy = obs.centerY - this.slamY;
                        if (dx * dx + dy * dy <= (this.radius + obs.radius) ** 2) {
                            const broken = obs.takeDamage(this.damage);
                            if (broken && game && typeof map.destroyCrate === 'function') {
                                map.destroyCrate(obs, game.lootManager, game.particles, null);
                            }
                        }
                    }
                }
            }

            if (game && game.camera && typeof game.camera.addShake === 'function') {
                game.camera.addShake(8);
            }
        }

        if (this.elapsed >= this.duration) {
            this.alive = false;
        }
    }

    draw(ctx, camera) {
        if (!this.alive) return;
        const sx = this.slamX - camera.x;
        const sy = this.slamY - camera.y;
        const p = this.elapsed / this.duration;

        ctx.save();
        if (p < 0.4) {
            const rise = Math.sin((p / 0.4) * Math.PI) * 40;
            ctx.beginPath();
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 16;
            ctx.arc(sx, sy - rise, 9, 0, Math.PI * 2);
            ctx.fill();
        } else {
            const sp = (p - 0.4) / 0.6;
            ctx.translate(sx, sy);
            ctx.strokeStyle = this.color;
            ctx.globalAlpha = 0.9 * (1 - sp);
            ctx.lineWidth = 6;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 24;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * sp, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#f0c419';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * sp * 0.7, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawPixi(g) {
        if (!this.alive || !g) return;
        const p = this.elapsed / this.duration;
        const colNum = parsePixiColor(this.color || '#f0533b').color;

        if (p < 0.4) {
            const rise = Math.sin((p / 0.4) * Math.PI) * 40;
            g.circle(this.slamX, this.slamY - rise, 9).fill({ color: colNum, alpha: 1 });
        } else {
            const sp = (p - 0.4) / 0.6;
            const alpha = 0.9 * (1 - sp);
            g.circle(this.slamX, this.slamY, this.radius * sp)
             .stroke({ color: colNum, width: 6, alpha });
            g.circle(this.slamX, this.slamY, this.radius * sp * 0.7)
             .stroke({ color: 0xf0c419, width: 2, alpha: alpha * 0.8 });
        }
    }
}


export class SkyfallEffect {
    constructor(targetX, targetY, damage = 70, delay = 500, owner, color = '#4caf6d') {
        this.x = targetX;
        this.y = targetY;
        this.damage = damage;
        this.delay = delay;
        this.owner = owner;
        this.color = color;
        this.elapsed = 0;
        this.duration = delay + 350;
        this.struck = false;
        this.alive = true;
    }

    update(dt, targets, map, game) {
        if (!this.alive) return;
        this.elapsed += dt;

        if (this.elapsed >= this.delay && !this.struck) {
            this.struck = true;
            const blastRadius = 60;
            if (targets) {
                for (let i = 0; i < targets.length; i++) {
                    const t = targets[i];
                    if (t && t.alive && t !== this.owner) {
                        const dx = t.x - this.x;
                        const dy = t.y - this.y;
                        if (dx * dx + dy * dy <= (blastRadius + t.radius) ** 2) {
                            if (!skillCanHit(map, this.x, this.y, t)) continue;
                            t.takeDamage(this.damage);
                            if (game && game.particles) game.particles.hit(t.x, t.y, this.color);
                            if (t.health <= 0 && game && typeof game.playerDied === 'function') {
                                game.playerDied(t, this.owner);
                            }
                        }
                    }
                }
            }

            if (map && typeof map.findCrateAt === 'function') {
                const crate = map.findCrateAt(this.x, this.y, blastRadius);
                if (crate && crate.alive) {
                    const broken = crate.takeDamage(this.damage);
                    if (broken && game && typeof map.destroyCrate === 'function') {
                        map.destroyCrate(crate, game.lootManager, game.particles, null);
                    }
                }
            }

            if (game && game.camera && typeof game.camera.addShake === 'function') {
                game.camera.addShake(6);
            }
        }

        if (this.elapsed >= this.duration) {
            this.alive = false;
        }
    }

    draw(ctx, camera) {
        if (!this.alive) return;
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        ctx.save();
        if (this.elapsed < this.delay) {
            const p = this.elapsed / this.delay;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(sx, sy, 28 - 8 * Math.sin(p * Math.PI * 3), 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#ff4d4d';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚠ Mục tiêu!', sx, sy - 35);
        } else {
            const beamProgress = (this.elapsed - this.delay) / 350;
            const y0 = sy - 400;
            const grad = ctx.createLinearGradient(sx, y0, sx, sy);
            grad.addColorStop(0, 'rgba(76, 175, 109, 0)');
            grad.addColorStop(1, 'rgba(76, 175, 109, 0.95)');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 8 * (1 - beamProgress * 0.5);
            ctx.shadowColor = '#4caf6d';
            ctx.shadowBlur = 24;
            ctx.beginPath();
            ctx.moveTo(sx, y0);
            ctx.lineTo(sx, sy);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('70', sx, sy - 20 - beamProgress * 25);
        }
        ctx.restore();
    }

    drawPixi(g) {
        if (!this.alive || !g) return;
        const colNum = parsePixiColor(this.color || '#4caf6d').color;

        if (this.elapsed < this.delay) {
            const p = this.elapsed / this.delay;
            const r = 28 - 8 * Math.sin(p * Math.PI * 3);
            g.circle(this.x, this.y, r).stroke({ color: colNum, width: 2, alpha: 0.85 });
            g.circle(this.x, this.y, 4).fill({ color: 0xff4d4d, alpha: 0.9 });
        } else {
            const beamProgress = (this.elapsed - this.delay) / 350;
            const alpha = Math.max(0, 1 - beamProgress * 0.7);
            g.moveTo(this.x, this.y - 400)
             .lineTo(this.x, this.y)
             .stroke({ color: colNum, width: 8 * (1 - beamProgress * 0.5), alpha });
            g.circle(this.x, this.y, 25 * (1 + beamProgress))
             .stroke({ color: 0xffffff, width: 2, alpha });
        }
    }
}


export class DashBlinkEffect {
    constructor(owner, dist = 100, damage = 35, color = '#4aa8ff', map, targets, game) {
        this.owner = owner;
        this.color = color;
        this.duration = 260;
        this.elapsed = 0;
        this.alive = true;
        this.trail = [];

        if (owner) {
            const startX = owner.x;
            const startY = owner.y;

            let endX = startX + Math.cos(owner.angle) * dist;
            let endY = startY + Math.sin(owner.angle) * dist;
            if (map && typeof map.resolveCollision === 'function') {
                const resolved = map.resolveCollision(startX, startY, owner.radius, Math.cos(owner.angle) * dist, Math.sin(owner.angle) * dist);
                endX = resolved.x;
                endY = resolved.y;
            }

            for (let i = 0; i < 5; i++) {
                const ratio = i / 4;
                this.trail.push({
                    x: startX + (endX - startX) * ratio,
                    y: startY + (endY - startY) * ratio
                });
            }

            owner.x = endX;
            owner.y = endY;

            if (targets) {
                for (let i = 0; i < targets.length; i++) {
                    const t = targets[i];
                    if (t && t.alive && t !== owner) {
                        const d = distToSegment(t.x, t.y, startX, startY, endX, endY);
                        if (d <= t.radius + 18) {
                            if (!skillCanHit(map, startX, startY, t)) continue;
                            t.takeDamage(damage);
                            if (game && game.particles) game.particles.hit(t.x, t.y, color);
                            if (t.health <= 0 && game && typeof game.playerDied === 'function') {
                                game.playerDied(t, owner);
                            }
                        }
                    }
                }
            }
        }
    }

    update(dt) {
        this.elapsed += dt;
        if (this.elapsed >= this.duration) {
            this.alive = false;
        }
    }

    draw(ctx, camera) {
        if (!this.alive || this.trail.length === 0) return;
        const p = this.elapsed / this.duration;

        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 16;
        for (let i = 0; i < this.trail.length; i++) {
            const pt = this.trail[i];
            const sx = pt.x - camera.x;
            const sy = pt.y - camera.y;
            ctx.fillStyle = this.color;
            ctx.globalAlpha = Math.max(0, (1 - p) * 0.3 * (i / this.trail.length));
            ctx.beginPath();
            ctx.arc(sx, sy, 14, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawPixi(g) {
        if (!this.alive || this.trail.length === 0 || !g) return;
        const p = this.elapsed / this.duration;
        const colNum = parsePixiColor(this.color || '#4aa8ff').color;
        for (let i = 0; i < this.trail.length; i++) {
            const pt = this.trail[i];
            const alpha = Math.max(0, (1 - p) * 0.35 * ((i + 1) / this.trail.length));
            g.circle(pt.x, pt.y, 14).fill({ color: colNum, alpha });
        }
    }
}

export class GhostThrustEffect {
    constructor(owner, range = 150, damage = 25, color = '#8b5cf6', targets, game) {
        this.owner = owner;
        this.range = range;
        this.damage = damage;
        this.color = color;
        this.duration = 450;
        this.elapsed = 0;
        this.alive = true;
        this.shotsFired = 0;
        this.targets = targets;
        this.game = game;
    }

    update(dt) {
        if (!this.alive || !this.owner) return;
        this.elapsed += dt;

        const expectedShots = Math.min(3, Math.floor(this.elapsed / 110) + 1);
        while (this.shotsFired < expectedShots) {
            this.fireGhostThrust(this.shotsFired);
            this.shotsFired++;
        }

        if (this.elapsed >= this.duration) {
            this.alive = false;
        }
    }

    fireGhostThrust(index) {
        if (!this.owner) return;
        const offsetAngle = (index - 1) * 0.08;
        const angle = this.owner.angle + offsetAngle;
        const startX = this.owner.x;
        const startY = this.owner.y;
        const endX = startX + Math.cos(angle) * this.range;
        const endY = startY + Math.sin(angle) * this.range;

        if (this.targets) {
            for (let i = 0; i < this.targets.length; i++) {
                const t = this.targets[i];
                if (t && t.alive && t !== this.owner) {
                    const d = distToSegment(t.x, t.y, startX, startY, endX, endY);
                    if (d <= t.radius + 15) {
                        if (!skillCanHit(this.game?.map, startX, startY, t)) continue;
                        t.takeDamage(this.damage);
                        if (typeof t.applyArmorShred === 'function') {
                            t.applyArmorShred(0.3, 2000);
                        }
                        if (this.game && this.game.particles) this.game.particles.hit(t.x, t.y, this.color);
                        if (t.health <= 0 && this.game && typeof this.game.playerDied === 'function') {
                            this.game.playerDied(t, this.owner);
                        }
                    }
                }
            }
        }
    }

    draw(ctx, camera) {
        if (!this.alive || !this.owner) return;
        const sx = this.owner.x - camera.x;
        const sy = this.owner.y - camera.y;

        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 16;
        for (let i = 0; i < this.shotsFired; i++) {
            const offsetAngle = (i - 1) * 0.08;
            const angle = this.owner.angle + offsetAngle;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(angle) * this.range, sy + Math.sin(angle) * this.range);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawPixi(g) {
        if (!this.alive || !this.owner || !g) return;
        const colNum = parsePixiColor(this.color || '#8b5cf6').color;
        for (let i = 0; i < this.shotsFired; i++) {
            const offsetAngle = (i - 1) * 0.08;
            const angle = this.owner.angle + offsetAngle;
            g.moveTo(this.owner.x, this.owner.y)
             .lineTo(this.owner.x + Math.cos(angle) * this.range, this.owner.y + Math.sin(angle) * this.range)
             .stroke({ color: colNum, width: 4, alpha: 0.85 });
        }
    }
}

export class FireArrowArcEffect {
    constructor(originX, originY, targetX, targetY, damage = 45, radius = 80, duration = 650, owner, color = '#ff7a45') {
        this.originX = originX;
        this.originY = originY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.damage = damage;
        this.radius = radius;
        this.duration = duration;
        this.owner = owner;
        this.color = color;
        this.elapsed = 0;
        this.alive = true;
    }

    update(dt, targets, map, game) {
        if (!this.alive) return;
        this.elapsed += dt;

        if (this.elapsed >= this.duration) {
            this.alive = false;
            if (targets) {
                for (let i = 0; i < targets.length; i++) {
                    const t = targets[i];
                    if (t && t.alive && t !== this.owner) {
                        const dx = t.x - this.targetX;
                        const dy = t.y - this.targetY;
                        if (dx * dx + dy * dy <= (this.radius + t.radius) ** 2) {
                            if (!skillCanHit(map, this.targetX, this.targetY, t)) continue;
                            t.takeDamage(this.damage);
                            if (game && game.particles) game.particles.hit(t.x, t.y, this.color);
                            if (t.health <= 0 && game && typeof game.playerDied === 'function') {
                                game.playerDied(t, this.owner);
                            }
                        }
                    }
                }
            }

            if (game && game.skillZones) {
                game.skillZones.push(new SkillZone(
                    this.targetX,
                    this.targetY,
                    this.radius,
                    3000,
                    500,
                    15,
                    0.2,
                    this.color,
                    'fire_arrow',
                    this.owner
                ));
            }
        }
    }

    draw(ctx, camera) {
        if (!this.alive) return;
        const p = Math.min(1, this.elapsed / this.duration);
        const curX = this.originX + (this.targetX - this.originX) * p;
        const curY = this.originY + (this.targetY - this.originY) * p - Math.sin(p * Math.PI) * 90;

        const sx = curX - camera.x;
        const sy = curY - camera.y;

        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawPixi(g) {
        if (!this.alive || !g) return;
        const p = Math.min(1, this.elapsed / this.duration);
        const curX = this.originX + (this.targetX - this.originX) * p;
        const curY = this.originY + (this.targetY - this.originY) * p - Math.sin(p * Math.PI) * 90;
        const colNum = parsePixiColor(this.color || '#ff7a45').color;

        g.circle(curX, curY, 4.5).fill({ color: colNum, alpha: 1 });
        g.circle(curX, curY, 7).stroke({ color: 0xffd700, width: 2, alpha: 0.7 });
    }
}


function distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

export class ShunpoEffect {
    constructor(startX, startY, endX, endY, angle, duration = 1000, color = '#ff1744') {
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.angle = angle;
        this.duration = duration;
        this.color = color;
        this.elapsed = 0;
        this.alive = true;
    }

    update(dt) {
        this.elapsed += dt;
        if (this.elapsed >= this.duration) {
            this.alive = false;
        }
    }

    draw(ctx, camera) {
        if (!this.alive) return;
        const p = Math.min(1, this.elapsed / this.duration);
        const alpha = Math.max(0, 1 - p);
        const sx1 = this.startX - camera.x;
        const sy1 = this.startY - camera.y;
        const sx2 = this.endX - camera.x;
        const sy2 = this.endY - camera.y;

        ctx.save();
        // 5 Fading afterimages along the path
        for (let i = 0; i < 5; i++) {
            const pp = Math.max(0, (1 - p) - i * 0.15);
            if (pp <= 0) continue;
            const ax = sx1 + (sx2 - sx1) * (i / 4);
            const ay = sy1 + (sy2 - sy1) * (i / 4);
            ctx.beginPath();
            ctx.fillStyle = `rgba(229, 72, 77, ${0.35 * pp})`;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 16;
            ctx.arc(ax, ay, 15 - i * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * pp})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Connecting dash ray
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3.5 * alpha;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.stroke();
        ctx.restore();
    }

    drawPixi(g) {
        if (!this.alive || !g) return;
        const p = Math.min(1, this.elapsed / this.duration);
        const alpha = Math.max(0, 1 - p);
        const colNum = parsePixiColor(this.color).color;

        for (let i = 0; i < 5; i++) {
            const pp = Math.max(0, (1 - p) - i * 0.15);
            if (pp <= 0) continue;
            const ax = this.startX + (this.endX - this.startX) * (i / 4);
            const ay = this.startY + (this.endY - this.startY) * (i / 4);
            g.circle(ax, ay, 15 - i * 1.5).fill({ color: colNum, alpha: 0.35 * pp });
        }
        g.moveTo(this.startX, this.startY)
         .lineTo(this.endX, this.endY)
         .stroke({ color: colNum, width: 3.5 * alpha, alpha: alpha * 0.8 });
    }
}

export class MugetsuWaveEffect {
    constructor(x, y, angle, range = 350, damage = 120, width = 80, owner, color = '#111111') {
        this.originX = x;
        this.originY = y;
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.range = range;
        this.damage = damage;
        this.width = width;
        this.owner = owner;
        this.color = color;
        this.speed = 14;
        this.distanceTraveled = 0;
        this.alive = true;
        this.hitTargets = new Set();
    }

    update(dt, targets, map, game) {
        if (!this.alive) return;
        const step = this.speed * (dt / 16.67);
        this.distanceTraveled += step;
        this.x += Math.cos(this.angle) * step;
        this.y += Math.sin(this.angle) * step;

        if (this.distanceTraveled >= this.range) {
            this.alive = false;
            return;
        }

        if (targets) {
            for (let i = 0; i < targets.length; i++) {
                const t = targets[i];
                if (t && t.alive && t !== this.owner && !this.hitTargets.has(t)) {
                    const dist = Math.hypot(t.x - this.x, t.y - this.y);
                    if (dist < this.width / 2 + t.radius) {
                        this.hitTargets.add(t);
                        if (!skillCanHit(map, this.x, this.y, t)) continue;
                        t.takeDamage(this.damage);
                        if (game && game.particles) {
                            game.particles.hit(t.x, t.y, '#d500f9');
                        }
                        if (game && game.camera && game.screenShakeEnabled) {
                            game.camera.addShake(8);
                        }
                        if (t.health <= 0 && game && typeof game.playerDied === 'function') {
                            game.playerDied(t, this.owner);
                        }
                    }
                }
            }
        }

        if (map && map.crates) {
            for (let i = 0; i < map.crates.length; i++) {
                const crate = map.crates[i];
                if (crate && crate.alive) {
                    const cx = crate.x + crate.w / 2;
                    const cy = crate.y + crate.h / 2;
                    if (Math.hypot(cx - this.x, cy - this.y) < this.width / 2 + 20) {
                        const broken = crate.takeDamage(this.damage);
                        if (game && game.particles) game.particles.woodSplinter(cx, cy, false);
                        if (broken && game) map.destroyCrate(crate, game.lootManager, game.particles, audio);
                    }
                }
            }
        }
    }

    draw(ctx, camera) {
        if (!this.alive) return;
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(this.angle);

        ctx.shadowColor = '#d500f9';
        ctx.shadowBlur = 24;
        ctx.fillStyle = '#111111';
        ctx.strokeStyle = '#d500f9';
        ctx.lineWidth = 4;

        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, -Math.PI / 2.2, Math.PI / 2.2);
        ctx.stroke();

        ctx.strokeStyle = '#ff1744';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(-8, 0, this.width / 2 - 4, -Math.PI / 2.3, Math.PI / 2.3);
        ctx.stroke();

        ctx.restore();
    }

    drawPixi(g) {
        if (!this.alive || !g) return;
        g.arc(this.x, this.y, this.width / 2, this.angle - Math.PI / 2.2, this.angle + Math.PI / 2.2)
         .stroke({ color: 0xd500f9, width: 6, alpha: 0.95 });
        g.arc(this.x - Math.cos(this.angle) * 8, this.y - Math.sin(this.angle) * 8, this.width / 2 - 4, this.angle - Math.PI / 2.3, this.angle + Math.PI / 2.3)
         .stroke({ color: 0xff1744, width: 3, alpha: 0.85 });
    }
}

export class ManchesterSmashEffect {
    constructor(owner, targetX, targetY, damage = 65, radius = 80, duration = 400, color = '#00e5ff') {
        this.owner = owner;
        this.startX = owner.x;
        this.startY = owner.y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.damage = damage;
        this.radius = radius;
        this.duration = duration;
        this.color = color;
        this.elapsed = 0;
        this.landed = false;
        this.alive = true;
    }

    update(dt, targets, map, game) {
        if (!this.alive) return;
        this.elapsed += dt;
        const progress = Math.min(1, this.elapsed / this.duration);

        if (!this.landed) {
            this.owner.x = this.startX + (this.targetX - this.startX) * progress;
            this.owner.y = this.startY + (this.targetY - this.startY) * progress;
            if (map) {
                this.owner.x = clamp(this.owner.x, 30, map.width - 30);
                this.owner.y = clamp(this.owner.y, 30, map.height - 30);
            }

            if (progress >= 1) {
                this.landed = true;
                if (targets) {
                    for (let i = 0; i < targets.length; i++) {
                        const t = targets[i];
                        if (t && t.alive && t !== this.owner) {
                            const d = Math.hypot(t.x - this.targetX, t.y - this.targetY);
                            if (d <= this.radius + t.radius) {
                                if (!skillCanHit(map, this.targetX, this.targetY, t)) continue;
                                t.takeDamage(this.damage);
                                const kbAngle = Math.atan2(t.y - this.targetY, t.x - this.targetX);
                                t.x += Math.cos(kbAngle) * 40;
                                t.y += Math.sin(kbAngle) * 40;
                                if (game && game.particles) game.particles.hit(t.x, t.y, this.color);
                                if (t.health <= 0 && game && typeof game.playerDied === 'function') {
                                    game.playerDied(t, this.owner);
                                }
                            }
                        }
                    }
                }
                if (game && game.camera && game.screenShakeEnabled) {
                    game.camera.addShake(8);
                }
                if (game && game.particles) {
                    game.particles.burst(this.targetX, this.targetY, this.color, 25);
                }
            }
        } else if (this.elapsed >= this.duration + 300) {
            this.alive = false;
        }
    }

    draw(ctx, camera) {
        if (!this.alive) return;
        const sx = this.targetX - camera.x;
        const sy = this.targetY - camera.y;

        ctx.save();
        if (this.landed) {
            const shockProgress = (this.elapsed - this.duration) / 300;
            const r = this.radius * Math.min(1, shockProgress * 1.3);
            const alpha = Math.max(0, 1 - shockProgress);
            ctx.strokeStyle = this.color;
            ctx.shadowColor = '#69f0ae';
            ctx.shadowBlur = 24;
            ctx.lineWidth = 6 * alpha;
            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.stroke();

            // Inner shockwave
            ctx.strokeStyle = '#eaf3ff';
            ctx.lineWidth = 3 * alpha;
            ctx.beginPath();
            ctx.arc(sx, sy, r * 0.7, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            const p = Math.min(1, this.elapsed / this.duration);
            const curX = this.startX + (this.targetX - this.startX) * p - camera.x;
            const curY = this.startY + (this.targetY - this.startY) * p - camera.y;
            const rise = Math.sin(p * Math.PI) * 44;

            // Leaping silhouette in air
            ctx.fillStyle = 'rgba(74, 144, 255, 0.85)';
            ctx.shadowColor = '#4a90ff';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.arc(curX, curY - rise, 12, 0, Math.PI * 2);
            ctx.fill();

            // Ground target indicator
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawPixi(g) {
        if (!this.alive || !g) return;
        const colNum = parsePixiColor(this.color).color;
        if (this.landed) {
            const shockProgress = (this.elapsed - this.duration) / 300;
            const r = this.radius * Math.min(1, shockProgress * 1.3);
            const alpha = Math.max(0, 1 - shockProgress);
            g.circle(this.targetX, this.targetY, r).stroke({ color: colNum, width: 6 * alpha, alpha: alpha });
            g.circle(this.targetX, this.targetY, r * 0.7).stroke({ color: 0xffffff, width: 3 * alpha, alpha: alpha * 0.8 });
        } else {
            const p = Math.min(1, this.elapsed / this.duration);
            const curX = this.startX + (this.targetX - this.startX) * p;
            const curY = this.startY + (this.targetY - this.startY) * p - Math.sin(p * Math.PI) * 44;
            g.circle(curX, curY, 12).fill({ color: 0x4a90ff, alpha: 0.85 });
            g.circle(this.targetX, this.targetY, this.radius).stroke({ color: colNum, width: 2, alpha: 0.5 });
        }
    }
}

export class UnitedStatesSmashEffect {
    constructor(owner, singleDamage = 150, aoeDamage = 80, radius = 300, recoil = 50, game) {
        this.owner = owner;
        this.singleDamage = singleDamage;
        this.aoeDamage = aoeDamage;
        this.radius = radius;
        this.recoil = recoil;
        this.duration = 800;
        this.elapsed = 0;
        this.alive = true;
        this.triggered = false;
        this.x = owner.x;
        this.y = owner.y;
        this.angle = owner.angle;
    }

    update(dt, targets, map, game) {
        if (!this.alive) return;
        this.elapsed += dt;

        if (!this.triggered) {
            this.triggered = true;
            const frontX = this.owner.x + Math.cos(this.angle) * 70;
            const frontY = this.owner.y + Math.sin(this.angle) * 70;
            let closest = null;
            let minDist = 90;

            if (targets) {
                for (let i = 0; i < targets.length; i++) {
                    const t = targets[i];
                    if (t && t.alive && t !== this.owner) {
                        const d = Math.hypot(t.x - frontX, t.y - frontY);
                        if (d < minDist) {
                            minDist = d;
                            closest = t;
                        }
                    }
                }
                if (closest) {
                    if (!skillCanHit(map, this.owner.x, this.owner.y, closest)) closest = null;
                }
                if (closest) {
                    closest.takeDamage(this.singleDamage);
                    if (game && game.particles) game.particles.hit(closest.x, closest.y, '#ffd700');
                    if (closest.health <= 0 && game && typeof game.playerDied === 'function') {
                        game.playerDied(closest, this.owner);
                    }
                }

                for (let i = 0; i < targets.length; i++) {
                    const t = targets[i];
                    if (t && t.alive && t !== this.owner && t !== closest) {
                        const d = Math.hypot(t.x - this.owner.x, t.y - this.owner.y);
                        if (d <= this.radius + t.radius) {
                            if (!skillCanHit(map, this.owner.x, this.owner.y, t)) continue;
                            t.takeDamage(this.aoeDamage);
                            const kb = Math.atan2(t.y - this.owner.y, t.x - this.owner.x);
                            t.x += Math.cos(kb) * 60;
                            t.y += Math.sin(kb) * 60;
                            if (game && game.particles) game.particles.hit(t.x, t.y, '#00e5ff');
                            if (t.health <= 0 && game && typeof game.playerDied === 'function') {
                                game.playerDied(t, this.owner);
                            }
                        }
                    }
                }
            }

            const selfDmg = Math.min(this.recoil, Math.max(0, this.owner.health - 1));
            if (selfDmg > 0) {
                this.owner.health -= selfDmg;
            }

            if (game && game.camera && game.screenShakeEnabled) {
                game.camera.addShake(15);
            }
            if (game) {
                game.screenDarkenTimer = 1000;
            }
        }

        if (this.elapsed >= this.duration) {
            this.alive = false;
        }
    }

    draw(ctx, camera) {
        if (!this.alive) return;
        const p = Math.min(1, this.elapsed / this.duration);
        const r = this.radius * p;
        const alpha = (1 - p);
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        ctx.save();
        ctx.strokeStyle = '#ffd700';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 24;
        ctx.lineWidth = 6 * alpha;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 3 * alpha;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    drawPixi(g) {
        if (!this.alive || !g) return;
        const p = Math.min(1, this.elapsed / this.duration);
        const r = this.radius * p;
        const alpha = (1 - p);

        g.circle(this.x, this.y, r).stroke({ color: 0xffd700, width: 6 * alpha, alpha: alpha });
        g.circle(this.x, this.y, r * 0.7).stroke({ color: 0x00e5ff, width: 3 * alpha, alpha: alpha * 0.8 });
    }
}

export class ChidoriDashEffect {
    constructor(owner, distance = 120, damage = 70, slowPct = 0.3, slowDuration = 1000, color = '#40c4ff', game) {
        this.owner = owner;
        this.startX = owner.x;
        this.startY = owner.y;
        this.angle = owner.angle;
        this.distance = distance;
        this.damage = damage;
        this.slowPct = slowPct;
        this.slowDuration = slowDuration;
        this.color = color;
        this.duration = 200;
        this.elapsed = 0;
        this.alive = true;

        this.endX = owner.x + Math.cos(this.angle) * this.distance;
        this.endY = owner.y + Math.sin(this.angle) * this.distance;
        if (game && game.map && game.map.width) {
            const resolved = game.map.resolveCollision(
                this.startX,
                this.startY,
                owner.radius,
                Math.cos(this.angle) * this.distance,
                Math.sin(this.angle) * this.distance
            );
            this.endX = resolved.x;
            this.endY = resolved.y;
        }
        this.owner.x = this.endX;
        this.owner.y = this.endY;

        if (game) {
            const targets = typeof game.getTargets === 'function' ? game.getTargets() : [];
            for (let i = 0; i < targets.length; i++) {
                const t = targets[i];
                if (t && t.alive && t !== this.owner) {
                    const d = distToSegment(t.x, t.y, this.startX, this.startY, this.endX, this.endY);
                    if (d <= 35 + t.radius) {
                        if (!skillCanHit(game.map, this.startX, this.startY, t)) continue;
                        t.takeDamage(this.damage);
                        if (t.buffs) {
                            t.buffs.slow = this.slowDuration;
                            t.buffs.slowPct = this.slowPct;
                        }
                        if (game.particles) game.particles.hit(t.x, t.y, this.color);
                        if (t.health <= 0 && typeof game.playerDied === 'function') {
                            game.playerDied(t, this.owner);
                        }
                    }
                }
            }
            if (game.camera && game.screenShakeEnabled) game.camera.addShake(6);
        }
    }

    update(dt) {
        this.elapsed += dt;
        if (this.elapsed >= this.duration) {
            this.alive = false;
        }
    }

    draw(ctx, camera) {
        if (!this.alive) return;
        const p = Math.min(1, this.elapsed / this.duration);
        const alpha = 1 - p;
        const sx1 = this.startX - camera.x;
        const sy1 = this.startY - camera.y;
        const sx2 = this.endX - camera.x;
        const sy2 = this.endY - camera.y;

        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.shadowColor = '#3fd0ff';
        ctx.shadowBlur = 22;
        ctx.lineWidth = 3.5 * alpha;
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);

        const dist = Math.hypot(sx2 - sx1, sy2 - sy1);
        const ang = Math.atan2(sy2 - sy1, sx2 - sx1);
        const perp = ang + Math.PI / 2;
        const steps = Math.max(3, Math.floor(dist / 14));
        for (let i = 1; i < steps; i++) {
            const frac = i / steps;
            const jitter = (Math.random() - 0.5) * 16;
            const bx = sx1 + Math.cos(ang) * (dist * frac) + Math.cos(perp) * jitter;
            const by = sy1 + Math.sin(ang) * (dist * frac) + Math.sin(perp) * jitter;
            ctx.lineTo(bx, by);
        }
        ctx.lineTo(sx2, sy2);
        ctx.stroke();

        // Inner white hot lightning thread
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 * alpha;
        ctx.stroke();
        ctx.restore();
    }

    drawPixi(g) {
        if (!this.alive || !g) return;
        const p = Math.min(1, this.elapsed / this.duration);
        const alpha = 1 - p;
        const colNum = parsePixiColor(this.color).color;
        g.moveTo(this.startX, this.startY)
         .lineTo(this.endX, this.endY)
         .stroke({ color: colNum, width: 3.5 * alpha, alpha: alpha });
    }
}

export class KamuiVortexEffect {
    constructor(x, y, radius = 100, damage = 40, duration = 1500, stunDuration = 1000, owner, color = '#7c4dff') {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.damage = damage;
        this.duration = duration;
        this.stunDuration = stunDuration;
        this.owner = owner;
        this.color = color;
        this.elapsed = 0;
        this.alive = true;
        this.rot = 0;
    }

    update(dt, targets, map, game) {
        if (!this.alive) return;
        this.elapsed += dt;
        this.rot += 0.08;

        if (targets) {
            for (let i = 0; i < targets.length; i++) {
                const t = targets[i];
                if (t && t.alive && t !== this.owner) {
                    const dist = Math.hypot(this.x - t.x, this.y - t.y);
                    if (dist < this.radius * 1.6) {
                        const pullAngle = Math.atan2(this.y - t.y, this.x - t.x);
                        const pullSpeed = 2.8;
                        t.x += Math.cos(pullAngle) * pullSpeed;
                        t.y += Math.sin(pullAngle) * pullSpeed;
                    }
                }
            }
        }

        if (this.elapsed >= this.duration) {
            this.alive = false;
            if (targets) {
                for (let i = 0; i < targets.length; i++) {
                    const t = targets[i];
                    if (t && t.alive && t !== this.owner) {
                    const dist = Math.hypot(this.x - t.x, this.y - t.y);
                    if (dist <= this.radius + t.radius) {
                            if (!skillCanHit(map, this.x, this.y, t)) continue;
                            t.takeDamage(this.damage);
                            if (t.buffs) t.buffs.stun = this.stunDuration;
                            if (game && game.particles) game.particles.hit(t.x, t.y, this.color);
                            if (t.health <= 0 && game && typeof game.playerDied === 'function') {
                                game.playerDied(t, this.owner);
                            }
                        }
                    }
                }
            }
            if (game && game.camera && game.screenShakeEnabled) {
                game.camera.addShake(8);
            }
            if (game && game.particles) {
                game.particles.burst(this.x, this.y, this.color, 30);
            }
        }
    }

    draw(ctx, camera) {
        if (!this.alive) return;
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        const p = Math.min(1, this.elapsed / this.duration);

        ctx.save();
        ctx.translate(sx, sy);

        // 3 Collapsing inward rotating spiral arcs
        for (let i = 0; i < 3; i++) {
            const rot = this.rot + i * (Math.PI * 2 / 3);
            const r = this.radius * (1 - p * 0.7);
            ctx.beginPath();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#8a5cf0';
            ctx.shadowBlur = 22;
            ctx.arc(0, 0, Math.max(6, r), rot, rot + 1.6);
            ctx.stroke();
        }

        // Inner singularity core
        ctx.fillStyle = 'rgba(18, 0, 43, 0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(4, this.radius * 0.3 * (1 - p * 0.5)), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawPixi(g) {
        if (!this.alive || !g) return;
        const p = Math.min(1, this.elapsed / this.duration);
        const colNum = parsePixiColor(this.color).color;
        for (let i = 0; i < 3; i++) {
            const rot = this.rot + i * (Math.PI * 2 / 3);
            const r = Math.max(6, this.radius * (1 - p * 0.7));
            g.arc(this.x, this.y, r, rot, rot + 1.6)
             .stroke({ color: colNum, width: 3.5, alpha: 0.85 });
        }
        g.circle(this.x, this.y, Math.max(4, this.radius * 0.3 * (1 - p * 0.5)))
         .fill({ color: 0x12002b, alpha: 0.9 });
    }
}

export class SusanooAuraEffect {
    constructor(owner, radius = 150, duration = 5000, pulseDamage = 50, pulseInterval = 2000, color = '#00b0ff') {
        this.owner = owner;
        this.radius = radius;
        this.duration = duration;
        this.pulseDamage = pulseDamage;
        this.pulseInterval = pulseInterval;
        this.color = color;
        this.elapsed = 0;
        this.lastPulse = 0;
        this.alive = true;
    }

    update(dt, targets, map, game) {
        if (!this.alive || !this.owner || !this.owner.alive) {
            this.alive = false;
            return;
        }
        this.elapsed += dt;
        if (this.elapsed >= this.duration) {
            this.alive = false;
            return;
        }

        if (this.elapsed - this.lastPulse >= this.pulseInterval) {
            this.lastPulse = this.elapsed;
            if (targets) {
                for (let i = 0; i < targets.length; i++) {
                    const t = targets[i];
                    if (t && t.alive && t !== this.owner) {
                        const d = Math.hypot(t.x - this.owner.x, t.y - this.owner.y);
                        if (d <= this.radius + t.radius) {
                            if (!skillCanHit(map, this.owner.x, this.owner.y, t)) continue;
                            t.takeDamage(this.pulseDamage);
                            const kb = Math.atan2(t.y - this.owner.y, t.x - this.owner.x);
                            t.x += Math.cos(kb) * 35;
                            t.y += Math.sin(kb) * 35;
                            if (game && game.particles) game.particles.hit(t.x, t.y, this.color);
                            if (t.health <= 0 && game && typeof game.playerDied === 'function') {
                                game.playerDied(t, this.owner);
                            }
                        }
                    }
                }
            }
            if (game && game.camera && game.screenShakeEnabled) game.camera.addShake(6);
            if (game && game.particles) game.particles.burst(this.owner.x, this.owner.y, this.color, 20);
        }
    }

    draw(ctx, camera) {
        if (!this.alive || !this.owner) return;
        const sx = this.owner.x - camera.x;
        const sy = this.owner.y - camera.y;

        ctx.save();
        ctx.strokeStyle = 'rgba(0, 176, 255, 0.7)';
        ctx.shadowColor = '#00b0ff';
        ctx.shadowBlur = 20;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.arc(sx, sy + i * 15, this.radius * 0.7, -Math.PI / 3, Math.PI / 3);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(sx, sy + i * 15, this.radius * 0.7, Math.PI * 2 / 3, Math.PI * 4 / 3);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawPixi(g) {
        if (!this.alive || !this.owner || !g) return;
        g.circle(this.owner.x, this.owner.y, this.radius).stroke({ color: 0x00b0ff, width: 3, alpha: 0.65 });
    }
}

export class StrikeAirEffect {
    constructor(owner, range = 250, damage = 60, knockback = 100, color = '#ffd700') {
        this.owner = owner;
        this.x = owner.x;
        this.y = owner.y;
        this.angle = owner.angle;
        this.range = range;
        this.damage = damage;
        this.knockback = knockback;
        this.color = color;
        this.duration = 300;
        this.elapsed = 0;
        this.alive = true;
        this.hitTargets = new Set();
    }

    update(dt, targets, map, game) {
        if (!this.alive) return;
        this.elapsed += dt;

        if (targets) {
            for (let i = 0; i < targets.length; i++) {
                const t = targets[i];
                if (t && t.alive && t !== this.owner && !this.hitTargets.has(t)) {
                    const dx = t.x - this.x;
                    const dy = t.y - this.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist <= this.range + t.radius) {
                        const ang = Math.atan2(dy, dx);
                        let diff = Math.abs(ang - this.angle);
                        while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
                        if (diff <= Math.PI / 4) {
                            this.hitTargets.add(t);
                            if (!skillCanHit(map, this.owner.x, this.owner.y, t)) continue;
                            t.takeDamage(this.damage);
                            t.x += Math.cos(this.angle) * this.knockback;
                            t.y += Math.sin(this.angle) * this.knockback;
                            if (game && game.particles) game.particles.hit(t.x, t.y, this.color);
                            if (t.health <= 0 && game && typeof game.playerDied === 'function') {
                                game.playerDied(t, this.owner);
                            }
                        }
                    }
                }
            }
        }

        if (this.elapsed >= this.duration) {
            this.alive = false;
        }
    }

    draw(ctx, camera) {
        if (!this.alive) return;
        const p = Math.min(1, this.elapsed / this.duration);
        const r = this.range * Math.min(1, p * 1.5);
        const alpha = Math.max(0, 1 - p);
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 22;
        ctx.lineWidth = 5 * alpha;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Inner pressure blast ring
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2.5 * alpha;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 0.65, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    drawPixi(g) {
        if (!this.alive || !g) return;
        const p = Math.min(1, this.elapsed / this.duration);
        const r = this.range * Math.min(1, p * 1.5);
        const alpha = Math.max(0, 1 - p);
        g.circle(this.x, this.y, r).stroke({ color: 0xffd700, width: 5 * alpha, alpha: alpha });
        g.circle(this.x, this.y, r * 0.65).stroke({ color: 0xffffff, width: 2.5 * alpha, alpha: alpha * 0.8 });
    }
}

export class ExcaliburBeamEffect {
    constructor(owner, length = 500, width = 80, damage = 150, color = '#ffd700', game) {
        this.owner = owner;
        this.x = owner.x;
        this.y = owner.y;
        this.angle = owner.angle;
        this.length = length;
        this.width = width;
        this.damage = damage;
        this.color = color;
        this.duration = 700;
        this.elapsed = 0;
        this.alive = true;
        this.hitTargets = new Set();
        this.hitCrates = new Set();
    }

    update(dt, targets, map, game) {
        if (!this.alive) return;
        this.elapsed += dt;

        const endX = this.x + Math.cos(this.angle) * this.length;
        const endY = this.y + Math.sin(this.angle) * this.length;

        if (targets) {
            for (let i = 0; i < targets.length; i++) {
                const t = targets[i];
                if (t && t.alive && t !== this.owner && !this.hitTargets.has(t)) {
                    const d = distToSegment(t.x, t.y, this.x, this.y, endX, endY);
                    if (d <= this.width / 2 + t.radius) {
                        this.hitTargets.add(t);
                        if (!skillCanHit(map, this.x, this.y, t)) continue;
                        t.takeDamage(this.damage);
                        if (game && game.particles) game.particles.hit(t.x, t.y, '#ffffff');
                        if (t.health <= 0 && game && typeof game.playerDied === 'function') {
                            game.playerDied(t, this.owner);
                        }
                    }
                }
            }
        }

        if (map && map.crates) {
            for (let i = 0; i < map.crates.length; i++) {
                const crate = map.crates[i];
                if (crate && crate.alive && !this.hitCrates.has(crate)) {
                    const cx = crate.x + crate.w / 2;
                    const cy = crate.y + crate.h / 2;
                    const d = distToSegment(cx, cy, this.x, this.y, endX, endY);
                    if (d <= this.width / 2 + 20) {
                        this.hitCrates.add(crate);
                        crate.takeDamage(this.damage);
                        if (game && game.particles) game.particles.woodSplinter(cx, cy, true);
                        if (game) map.destroyCrate(crate, game.lootManager, game.particles, audio);
                    }
                }
            }
        }

        if (this.elapsed >= this.duration) {
            this.alive = false;
        }
    }

    draw(ctx, camera) {
        if (!this.alive) return;
        const p = Math.min(1, this.elapsed / this.duration);
        const alpha = Math.sin(p * Math.PI);
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(this.angle);

        const len = this.length * Math.min(1, p * 2.5);
        const w = this.width * alpha;

        // Beam gradient
        const grad = ctx.createLinearGradient(0, 0, len, 0);
        grad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * alpha})`);
        grad.addColorStop(0.35, `rgba(255, 235, 59, ${0.85 * alpha})`);
        grad.addColorStop(1, `rgba(255, 215, 0, ${0.2 * alpha})`);

        ctx.fillStyle = grad;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 35;
        ctx.fillRect(0, -w / 2, len, w);

        // Inner white light core
        ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * alpha})`;
        ctx.fillRect(0, -w * 0.25, len, w * 0.5);

        // Core burst at hilt
        ctx.beginPath();
        ctx.arc(0, 0, w * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
    }

    drawPixi(g) {
        if (!this.alive || !g) return;
        const p = Math.min(1, this.elapsed / this.duration);
        const alpha = Math.sin(p * Math.PI);
        const endX = this.x + Math.cos(this.angle) * this.length;
        const endY = this.y + Math.sin(this.angle) * this.length;

        g.moveTo(this.x, this.y)
         .lineTo(endX, endY)
         .stroke({ color: 0xffd700, width: (this.width + 20) * alpha, alpha: alpha * 0.6 });
        g.moveTo(this.x, this.y)
         .lineTo(endX, endY)
         .stroke({ color: 0xffffff, width: this.width * alpha, alpha: alpha });
    }
}

export class TripleGateEffect {
    constructor(owner, range = 450, damage = 40, color = '#ffd700', game) {
        this.owner = owner;
        this.range = range;
        this.damage = damage;
        this.color = color;
        this.duration = 400;
        this.elapsed = 0;
        this.alive = true;
        this.firedCount = 0;
        this.angles = [
            owner.angle - 0.26,
            owner.angle,
            owner.angle + 0.26
        ];
    }

    update(dt, targets, map, game) {
        if (!this.alive) return;
        this.elapsed += dt;

        while (this.firedCount < 3 && this.elapsed >= this.firedCount * 80) {
            const ang = this.angles[this.firedCount];
            if (game && game.projectilePool) {
                game.projectilePool.spawn(
                    this.owner.x + Math.cos(ang) * 25,
                    this.owner.y + Math.sin(ang) * 25,
                    ang,
                    {
                        speed: 20,
                        range: this.range,
                        damage: this.damage,
                        radius: 6,
                        color: '#ffd700',
                        isBabylon: true,
                        pierce: 2
                    },
                    this.owner
                );
            }
            this.firedCount++;
        }

        if (this.elapsed >= this.duration) {
            this.alive = false;
        }
    }

    draw(ctx, camera) {
        if (!this.alive) return;
        const sx = this.owner.x - camera.x;
        const sy = this.owner.y - camera.y;

        ctx.save();
        ctx.strokeStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 14;
        ctx.lineWidth = 2.5;

        for (let i = 0; i < 3; i++) {
            const a = this.angles[i];
            const gx = sx - Math.cos(a) * 25;
            const gy = sy - Math.sin(a) * 25;
            ctx.beginPath();
            ctx.arc(gx, gy, 10, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawPixi(g) {
        if (!this.alive || !g) return;
        for (let i = 0; i < 3; i++) {
            const a = this.angles[i];
            const gx = this.owner.x - Math.cos(a) * 25;
            const gy = this.owner.y - Math.sin(a) * 25;
            g.circle(gx, gy, 10).stroke({ color: 0xffd700, width: 2.5, alpha: 0.85 });
        }
    }
}

export class EnkiduChainEffect {
    constructor(owner, targetX, targetY, maxRange = 200, damage = 25, rootDuration = 2000, color = '#ffd700') {
        this.owner = owner;
        this.startX = owner.x;
        this.startY = owner.y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.damage = damage;
        this.rootDuration = rootDuration;
        this.color = color;
        this.duration = 800;
        this.elapsed = 0;
        this.alive = true;
        this.hit = false;
        this.lockedTarget = null;
    }

    update(dt, targets, map, game) {
        if (!this.alive) return;
        this.elapsed += dt;

        if (!this.hit) {
            this.hit = true;
            if (targets) {
                let closest = null;
                let minDist = 70;
                for (let i = 0; i < targets.length; i++) {
                    const t = targets[i];
                    if (t && t.alive && t !== this.owner) {
                        const d = Math.hypot(t.x - this.targetX, t.y - this.targetY);
                        if (d < minDist) {
                            minDist = d;
                            closest = t;
                        }
                    }
                }
                if (closest) {
                    if (!skillCanHit(map, this.owner.x, this.owner.y, closest)) closest = null;
                }
                if (closest) {
                    this.lockedTarget = closest;
                    closest.takeDamage(this.damage);
                    if (closest.buffs) {
                        closest.buffs.rooted = this.rootDuration;
                        closest.buffs.stun = this.rootDuration;
                    }
                    if (game && game.particles) game.particles.hit(closest.x, closest.y, this.color);
                    if (closest.health <= 0 && game && typeof game.playerDied === 'function') {
                        game.playerDied(closest, this.owner);
                    }
                }
            }
        }

        if (this.elapsed >= this.duration) {
            this.alive = false;
        }
    }

    draw(ctx, camera) {
        if (!this.alive) return;
        const sx1 = this.owner.x - camera.x;
        const sy1 = this.owner.y - camera.y;
        const endX = (this.lockedTarget ? this.lockedTarget.x : this.targetX) - camera.x;
        const endY = (this.lockedTarget ? this.lockedTarget.y : this.targetY) - camera.y;

        ctx.save();
        ctx.strokeStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 14;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Pulsing concentric chain binding rings around victim
        ctx.setLineDash([]);
        const pulse = 0.5 + 0.5 * Math.sin(this.elapsed * 0.02);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(endX, endY, 22 + 4 * pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(endX, endY, 16 + 2 * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    drawPixi(g) {
        if (!this.alive || !g) return;
        const endX = this.lockedTarget ? this.lockedTarget.x : this.targetX;
        const endY = this.lockedTarget ? this.lockedTarget.y : this.targetY;
        g.moveTo(this.owner.x, this.owner.y)
         .lineTo(endX, endY)
         .stroke({ color: 0xffd700, width: 3, alpha: 0.9 });
        const pulse = 0.5 + 0.5 * Math.sin(this.elapsed * 0.02);
        g.circle(endX, endY, 22 + 4 * pulse).stroke({ color: 0xffd700, width: 2.5, alpha: 0.9 });
    }
}

export class EnumaElishVortexEffect {
    constructor(x, y, radius = 150, dotDamage = 120, burstDamage = 200, duration = 3000, owner, color = '#d50000', game) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.dotDamage = dotDamage;
        this.burstDamage = burstDamage;
        this.duration = duration;
        this.owner = owner;
        this.color = color;
        this.elapsed = 0;
        this.lastDotTick = 0;
        this.dotInterval = 250;
        this.rot = 0;
        this.alive = true;
    }

    update(dt, targets, map, game) {
        if (!this.alive) return;
        this.elapsed += dt;
        this.rot += 0.12;

        if (targets) {
            for (let i = 0; i < targets.length; i++) {
                const t = targets[i];
                if (t && t.alive && t !== this.owner) {
                    const dist = Math.hypot(this.x - t.x, this.y - t.y);
                    if (dist < this.radius * 1.5) {
                        const pullAngle = Math.atan2(this.y - t.y, this.x - t.x);
                        t.x += Math.cos(pullAngle) * 2.5;
                        t.y += Math.sin(pullAngle) * 2.5;
                    }
                }
            }
        }

        if (this.elapsed - this.lastDotTick >= this.dotInterval) {
            this.lastDotTick = this.elapsed;
            const tickDmg = Math.round(this.dotDamage / (this.duration / this.dotInterval));
            if (targets) {
                for (let i = 0; i < targets.length; i++) {
                    const t = targets[i];
                    if (t && t.alive && t !== this.owner) {
                        if (Math.hypot(this.x - t.x, this.y - t.y) <= this.radius + t.radius) {
                            if (!skillCanHit(map, this.x, this.y, t)) continue;
                            t.takeDamage(tickDmg);
                            if (game && game.particles) game.particles.hit(t.x, t.y, this.color);
                            if (t.health <= 0 && game && typeof game.playerDied === 'function') {
                                game.playerDied(t, this.owner);
                            }
                        }
                    }
                }
            }
        }

        if (this.elapsed >= this.duration) {
            this.alive = false;
            if (targets) {
                for (let i = 0; i < targets.length; i++) {
                    const t = targets[i];
                    if (t && t.alive && t !== this.owner) {
                        if (Math.hypot(this.x - t.x, this.y - t.y) <= this.radius + t.radius) {
                            if (!skillCanHit(map, this.x, this.y, t)) continue;
                            t.takeDamage(this.burstDamage);
                            if (game && game.particles) game.particles.hit(t.x, t.y, '#ffd700');
                            if (t.health <= 0 && game && typeof game.playerDied === 'function') {
                                game.playerDied(t, this.owner);
                            }
                        }
                    }
                }
            }
            if (game && game.camera && game.screenShakeEnabled) {
                game.camera.addShake(16);
            }
            if (game && game.particles) {
                game.particles.burst(this.x, this.y, '#d50000', 40);
            }
        }
    }

    draw(ctx, camera) {
        if (!this.alive) return;
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        const p = Math.min(1, this.elapsed / this.duration);

        ctx.save();
        ctx.translate(sx, sy);

        // 3 Collapsing inward rotating spatial rift arcs
        for (let i = 0; i < 3; i++) {
            const rot = this.rot + i * (Math.PI * 2 / 3);
            const r = this.radius * (1 - p * 0.6);
            ctx.beginPath();
            ctx.strokeStyle = '#e0483e';
            ctx.lineWidth = 4.5;
            ctx.shadowColor = '#d50000';
            ctx.shadowBlur = 26;
            ctx.arc(0, 0, Math.max(10, r), rot, rot + 1.6);
            ctx.stroke();

            // Dark inner edge
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(26, 0, 8, 0.75)';
            ctx.lineWidth = 2.5;
            ctx.arc(0, 0, Math.max(8, r - 4), rot, rot + 1.6);
            ctx.stroke();
        }

        // Singularity void core
        ctx.fillStyle = '#0a0004';
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(6, this.radius * 0.35 * (1 - p * 0.5)), 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawPixi(g) {
        if (!this.alive || !g) return;
        g.circle(this.x, this.y, this.radius * 0.3).fill({ color: 0x111111, alpha: 0.9 });
        g.circle(this.x, this.y, this.radius * 0.65).stroke({ color: 0xd50000, width: 3.5, alpha: 0.8 });
        g.circle(this.x, this.y, this.radius).stroke({ color: 0xff1744, width: 4, alpha: 0.7 });
    }
}
