import { CONFIG } from '../config.js';
import { Noise } from '../utils/noise.js';
import { BIOMES, getBiome } from './biomes.js';

export class World {
    constructor(game) {
        this.game = game;
        this.width = CONFIG.WORLD_SIZE;
        this.height = CONFIG.WORLD_SIZE;
        this.tileSize = CONFIG.TILE_SIZE;
        this.tiles = [];
        this.seed = Math.random();
        this.noise = new Noise(this.seed);
    }

    generate() {
        console.log('Generating world with seed:', this.seed);

        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                // Generate base terrain
                const n = this.noise.noise(x * 0.05, y * 0.05) +
                          this.noise.noise(x * 0.1 + 100, y * 0.1 + 100) * 0.5;

                const biome = getBiome(n);

                this.tiles[y][x] = {
                    x, y,
                    biome: biome.id,
                    traversable: biome.traversable,
                    speed: biome.speed || 1.0,
                    structure: null,
                    explored: false
                };
            }
        }

        // Place structures (Towns, Dungeons)
        this.placeStructures();
    }

    placeStructures() {
        // Place one town
        const center = Math.floor(this.width / 2);
        // Ensure town is on land
        let townPlaced = false;
        let radius = 0;

        while (!townPlaced && radius < 20) {
            for (let y = center - radius; y <= center + radius; y++) {
                for (let x = center - radius; x <= center + radius; x++) {
                    if (this.isValidStructureLocation(x, y)) {
                        this.tiles[y][x].structure = 'town';
                        this.tiles[y][x].biome = 'town';
                        this.tiles[y][x].traversable = true;
                        townPlaced = true;
                        console.log('Town placed at', x, y);
                        break;
                    }
                }
                if (townPlaced) break;
            }
            radius++;
        }
    }

    isValidStructureLocation(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        const tile = this.tiles[y][x];
        return tile.biome !== 'water' && tile.biome !== 'mountain';
    }

    render(ctx, camera) {
        const startX = Math.floor(Math.max(0, camera.x / this.tileSize));
        const startY = Math.floor(Math.max(0, camera.y / this.tileSize));
        const endX = Math.min(this.width, startX + Math.ceil(this.game.width / this.tileSize) + 1);
        const endY = Math.min(this.height, startY + Math.ceil(this.game.height / this.tileSize) + 1);

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = this.tiles[y][x];
                const px = Math.floor(x * this.tileSize - camera.x);
                const py = Math.floor(y * this.tileSize - camera.y);

                // Base tile
                ctx.fillStyle = CONFIG.COLORS[tile.biome] || '#000';
                ctx.fillRect(px, py, this.tileSize, this.tileSize);

                // Grid lines (optional debug)
                // ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                // ctx.strokeRect(px, py, this.tileSize, this.tileSize);
            }
        }
    }

    checkCollision(x, y) {
        const tx = Math.floor(x / this.tileSize);
        const ty = Math.floor(y / this.tileSize);

        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return true; // World bounds

        const tile = this.tiles[ty][tx];
        return !tile.traversable;
    }

    getTile(x, y) {
        const tx = Math.floor(x / this.tileSize);
        const ty = Math.floor(y / this.tileSize);
        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return null;
        return this.tiles[ty][tx];
    }
}
