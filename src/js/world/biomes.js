export const BIOMES = {
    WATER: { id: 'water', color: '#3a5a8a', traversable: false },
    SWAMP: { id: 'swamp', color: '#4a5a3a', traversable: true, speed: 0.7 },
    GRASS: { id: 'grass', color: '#3d6a4a', traversable: true, speed: 1.0 },
    FOREST: { id: 'forest', color: '#2d4a3a', traversable: true, speed: 0.9 },
    MOUNTAIN: { id: 'mountain', color: '#6a5a4a', traversable: false },
    SNOW: { id: 'snow', color: '#9a9aaa', traversable: true, speed: 0.8 },
    TOWN: { id: 'town', color: '#d4a853', traversable: true, speed: 1.0 },
    DUNGEON: { id: 'dungeon', color: '#5a3a6a', traversable: true, speed: 1.0 }
};

export function getBiome(noise) {
    if (noise < -0.5) return BIOMES.WATER;
    if (noise < -0.3) return BIOMES.SWAMP;
    if (noise < 0) return BIOMES.GRASS;
    if (noise < 0.3) return BIOMES.FOREST;
    if (noise < 0.6) return BIOMES.MOUNTAIN;
    return BIOMES.SNOW;
}
