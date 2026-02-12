export const CONFIG = {
    TILE_SIZE: 40,
    WORLD_SIZE: 100,
    FPS: 60,
    COLORS: {
        grass: '#3d6a4a',
        forest: '#2d4a3a',
        mountain: '#6a5a4a',
        water: '#3a5a8a',
        swamp: '#4a5a3a',
        snow: '#9a9aaa',
        sand: '#c4b494',
        town: '#d4a853',
        dungeon: '#5a3a6a',
        player: '#d4a853',
        npc: '#bd93f9',
        enemy: '#ff4444'
    },
    RARITY_COLORS: {
        common: '#888888',
        uncommon: '#44ff44',
        rare: '#4444ff',
        epic: '#aa44ff',
        legendary: '#ffaa00'
    },
    DIFFICULTY: {
        easy: 0.8,
        normal: 1.0,
        hard: 1.3
    },
    CLASSES: {
        warrior: {
            name: 'Warrior',
            desc: 'Masters of melee combat. Bonus: +20% Damage, +15% HP',
            bonuses: { damage: 1.2, maxHp: 1.15 },
            baseStats: { str: 8, agi: 4, int: 3, vit: 7, cha: 3 }
        },
        ranger: {
            name: 'Ranger',
            desc: 'Expert marksmen. Bonus: +10% Speed, +10% Crit Chance',
            bonuses: { speed: 1.1, critChance: 0.1 },
            baseStats: { str: 4, agi: 8, int: 4, vit: 5, cha: 4 }
        },
        mage: {
            name: 'Mage',
            desc: 'Arcane wielders. Bonus: +100% MP, +MP Regen',
            bonuses: { maxMp: 2.0, mpRegen: 1.5 },
            baseStats: { str: 3, agi: 4, int: 9, vit: 4, cha: 5 }
        },
        rogue: {
            name: 'Rogue',
            desc: 'Stealthy assassins. Bonus: +15% Crit, +5% Speed',
            bonuses: { critChance: 0.15, speed: 1.05 },
            baseStats: { str: 5, agi: 7, int: 4, vit: 4, cha: 5 }
        }
    },
    ENEMY_TYPES: {
        wolf:     { name: 'Wolf',     color: '#8B4513', hp: 60,  dmg: 8,  speed: 120, xp: 15, icon: 'W' },
        bandit:   { name: 'Bandit',   color: '#cc4444', hp: 100, dmg: 12, speed: 80,  xp: 25, icon: 'B' },
        skeleton: { name: 'Skeleton', color: '#ddddaa', hp: 50,  dmg: 15, speed: 100, xp: 20, icon: 'S' },
        orc:      { name: 'Orc',      color: '#448844', hp: 180, dmg: 18, speed: 60,  xp: 40, icon: 'O' },
        spider:   { name: 'Spider',   color: '#444444', hp: 40,  dmg: 10, speed: 130, xp: 18, icon: 'X' },
        slime:    { name: 'Slime',    color: '#44cc44', hp: 80,  dmg: 5,  speed: 40,  xp: 10, icon: 'G' }
    },
    AI_MODEL: 'deepseek-chat',
    DEEPSEEK_API_URL: 'https://api.deepseek.com/v1/chat/completions',
    AI_RESPONSE_LENGTH: {
        short: 300,
        medium: 500,
        long: 800
    }
};
