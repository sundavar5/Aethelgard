/**
 * Biome definitions for world generation.
 * Each biome has traversability, speed modifiers, and noise thresholds.
 */
export const BIOMES = {
    water:    { id: 'water',    traversable: false, speed: 0,   minNoise: -Infinity, maxNoise: -0.3 },
    swamp:    { id: 'swamp',    traversable: true,  speed: 0.6, minNoise: -0.3,      maxNoise: -0.1 },
    grass:    { id: 'grass',    traversable: true,  speed: 1.0, minNoise: -0.1,      maxNoise: 0.2 },
    forest:   { id: 'forest',   traversable: true,  speed: 0.8, minNoise: 0.2,       maxNoise: 0.5 },
    mountain: { id: 'mountain', traversable: false, speed: 0,   minNoise: 0.5,       maxNoise: 0.7 },
    snow:     { id: 'snow',     traversable: true,  speed: 0.7, minNoise: 0.7,       maxNoise: Infinity }
};

/**
 * Get biome for a given noise value.
 * @param {number} noise - The combined noise value.
 * @returns {object} The biome definition.
 */
export function getBiome(noise) {
    if (noise < -0.3)  return BIOMES.water;
    if (noise < -0.1)  return BIOMES.swamp;
    if (noise < 0.2)   return BIOMES.grass;
    if (noise < 0.5)   return BIOMES.forest;
    if (noise < 0.7)   return BIOMES.mountain;
    return BIOMES.snow;
}
