export const CONFIG = {
    TILE_SIZE: 40,
    WORLD_SIZE: 100, // 100x100 tiles
    FPS: 60,
    COLORS: {
        grass: '#3d6a4a',
        forest: '#2d4a3a',
        mountain: '#6a5a4a',
        water: '#3a5a8a',
        swamp: '#4a5a3a',
        snow: '#9a9aaa',
        town: '#d4a853',
        dungeon: '#5a3a6a',
        player: '#d4a853',
        npc: '#bd93f9',
        enemy: '#ff4444'
    },
    DIFFICULTY: {
        easy: 0.8,
        normal: 1.0,
        hard: 1.3
    },
    AI_MODEL: 'deepseek-chat',
    DEEPSEEK_API_URL: 'https://api.deepseek.com/v1/chat/completions'
};
