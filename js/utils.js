export const CONSTANTS = {
    MAP_WIDTH: 4800,
    MAP_HEIGHT: 4800,
    PLAYER_RADIUS: 16,
    ENEMY_RADIUS: 16,
    PLAYER_SPEED: 0.85,
    ENEMY_SPEED: 0.65,
    FRICTION: 0.85,
    ZONE_DAMAGE: 4,
    MAX_ENEMIES: 9,
    LOOT_COUNT: 28
};

export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

export function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

export function angleBetween(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Mulberry32 Deterministic Seeded PRNG
let currentSeed = 123456789;

export function setRandomSeed(seed) {
    if (seed === null || seed === undefined) {
        currentSeed = (Date.now() ^ (Math.random() * 0xFFFFFFFF)) >>> 0;
        return;
    }
    if (typeof seed === 'string') {
        const clean = seed.toString().trim().toUpperCase().replace(/^VLST-/i, '');
        let h = 2166136261 >>> 0;
        for (let i = 0; i < clean.length; i++) {
            h = Math.imul(h ^ clean.charCodeAt(i), 16777619);
        }
        currentSeed = h >>> 0;
    } else if (typeof seed === 'number') {
        currentSeed = (seed >>> 0) || 123456789;
    }
}

export function seededRandom() {
    let t = (currentSeed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randomFloat(min = 0, max = 1) {
    return seededRandom() * (max - min) + min;
}

export function randomRange(min, max) {
    return seededRandom() * (max - min) + min;
}

export function randomInt(min, max) {
    return Math.floor(seededRandom() * (max - min + 1)) + min;
}

export const ITEMS = {
    DAI_HOAN_DAN: {
        name: 'ĐẠI HOÀN ĐAN',
        type: 'health',
        value: 50,
        color: '#00e676',
        icon: '🍶'
    },
    TIEU_HOAN_DAN: {
        name: 'TIỂU HOÀN ĐAN',
        type: 'health',
        value: 25,
        color: '#69f0ae',
        icon: '💊'
    },
    NHUAN_VI_GIAP: {
        name: 'NHUYỄN VỊ GIÁP',
        type: 'armor',
        value: 50,
        color: '#ffd700',
        icon: '🥋'
    },
    KIM_CHUNG_TRAO: {
        name: 'KIM CHUNG TRÁO',
        type: 'armor',
        value: 25,
        color: '#ffb300',
        icon: '🛡️'
    },
    AMMO_PHI_CHAM: {
        name: 'BỘ PHI CHÂM',
        type: 'ammo',
        ammoType: 'needles',
        amount: 15,
        color: '#ff7043',
        icon: '🪡'
    },
    AMMO_TU_TIEN: {
        name: 'HỘP TỤ TIỄN',
        type: 'ammo',
        ammoType: 'arrows',
        amount: 25,
        color: '#81c784',
        icon: '🏹'
    },
    AMMO_KIEM_KHI: {
        name: 'CHÂN KHÍ THẠCH',
        type: 'ammo',
        ammoType: 'sword_qi',
        amount: 6,
        color: '#e040fb',
        icon: '🔮'
    },
    AMMO_PHI_TIEU: {
        name: 'TÚI PHI TIÊU',
        type: 'ammo',
        ammoType: 'darts',
        amount: 35,
        color: '#00e5ff',
        icon: '✴️'
    }
};

// Aliases for backward compatibility
ITEMS.MEDKIT = ITEMS.DAI_HOAN_DAN;
ITEMS.BANDAGE = ITEMS.TIEU_HOAN_DAN;
ITEMS.ARMOR_VEST = ITEMS.NHUAN_VI_GIAP;
ITEMS.ARMOR_HELMET = ITEMS.KIM_CHUNG_TRAO;
ITEMS.AMMO_SHELLS = ITEMS.AMMO_PHI_CHAM;
ITEMS.AMMO_HEAVY = ITEMS.AMMO_TU_TIEN;
ITEMS.AMMO_SNIPER = ITEMS.AMMO_KIEM_KHI;
ITEMS.AMMO_LIGHT = ITEMS.AMMO_PHI_TIEU;

export const WEAPON_INFO = {
    QUYEN_CUOC: { name: 'QUYỀN CƯỚC', type: 'melee', color: '#ffecb3', icon: '👊' },
    TRUONG_KIEM: { name: 'TRƯỜNG KIẾM', type: 'melee', color: '#4aa8ff', icon: '⚔️' },
    THIET_PHIEN: { name: 'THIẾT PHIẾN', type: 'melee', color: '#ff7a45', icon: '🪭' },
    LONG_UYET_DAO: { name: 'LONG UYỆT ĐAO', type: 'melee', color: '#f0533b', icon: '🗡️' },
    MA_THIEN_THUONG: { name: 'MA THIÊN THƯƠNG', type: 'melee', color: '#8b5cf6', icon: '🔱' },
    BACH_HOP_CUNG: { name: 'BÁCH HỢP CUNG', type: 'weapon', color: '#4caf6d', icon: '🏹' },

    // ⚔️ 5 ANIME LEGENDARY WEAPONS
    ZANGETSU: { name: 'ZANGETSU', type: 'melee', color: '#ff1744', color2: '#111111', icon: '🗡️', rarity: 'legendary' },
    ONE_FOR_ALL: { name: 'ONE FOR ALL', type: 'melee', color: '#00e5ff', color2: '#00e676', icon: '🥊', rarity: 'legendary' },
    KATON: { name: 'KATON', type: 'weapon', color: '#40c4ff', color2: '#7c4dff', icon: '🥷', rarity: 'legendary' },
    EXCALIBUR: { name: 'EXCALIBUR', type: 'melee', color: '#ffd700', color2: '#ffffff', icon: '🔮', rarity: 'legendary' },
    GATE_OF_BABYLON: { name: 'GATE OF BABYLON', type: 'weapon', color: '#ffb300', color2: '#d50000', icon: '🏹', rarity: 'legendary' },

    // Unarmed combat remains the sole skill-less fallback.
};

WEAPON_INFO.FISTS = WEAPON_INFO.QUYEN_CUOC;

export function getItemByName(itemName) {
    if (ITEMS[itemName]) {
        return ITEMS[itemName];
    }
    if (WEAPON_INFO[itemName]) {
        return WEAPON_INFO[itemName];
    }
    return {
        name: itemName,
        type: 'weapon',
        color: '#ffd700',
        icon: '⚔️'
    };
}

export function parsePixiColor(color, defaultAlpha = 1) {
    if (typeof color === 'number') {
        return { color, alpha: defaultAlpha };
    }
    if (typeof color === 'string') {
        if (color.startsWith('#')) {
            return {
                color: parseInt(color.slice(1), 16),
                alpha: defaultAlpha
            };
        }
        if (color.startsWith('rgba') || color.startsWith('rgb')) {
            const m = color.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
            if (m) {
                const r = parseInt(m[1], 10);
                const g = parseInt(m[2], 10);
                const b = parseInt(m[3], 10);
                const a = m[4] !== undefined ? parseFloat(m[4]) : defaultAlpha;
                return {
                    color: (r << 16) | (g << 8) | b,
                    alpha: a
                };
            }
        }
    }
    return { color: 0xffffff, alpha: defaultAlpha };
}
