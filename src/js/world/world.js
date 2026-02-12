import { CONFIG } from '../config.js';
import { Noise } from '../utils/noise.js';
import { BIOMES, getBiome } from './biomes.js';
import { Enemy } from '../entities/enemy.js';
import { NPC } from '../entities/npc.js';
import { Item } from '../entities/item.js';
import { Interactable } from '../entities/interactable.js';

export const WEATHER_TYPES = {
    CLEAR: 'clear',
    RAIN: 'rain',
    SNOW: 'snow',
    STORM: 'storm'
};

/**
 * World System - Procedural generation, biomes, time, weather, entity spawning.
 */
export class World {
    constructor(game) {
        this.game = game;
        this.width = CONFIG.WORLD_SIZE;
        this.height = CONFIG.WORLD_SIZE;
        this.tileSize = CONFIG.TILE_SIZE;
        this.tiles = [];
        this.seed = Math.random();
        this.noise = null;

        // Time system
        this.time = 8.0; // 8 AM
        this.day = 1;
        this.dayDuration = 300; // 5 minutes per game day

        // Weather system
        this.weather = WEATHER_TYPES.CLEAR;
        this.weatherTimer = 60 + Math.random() * 60;
        this.weatherDuration = 120;

        // Structures tracked
        this.structures = [];
    }

    generate() {
        this.noise = new Noise(typeof this.seed === 'number' ? this.seed : this.hashSeed(this.seed));
        console.log('Generating world with seed:', this.seed);

        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
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

        this.placeStructures();
    }

    hashSeed(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash) / 2147483647;
    }

    placeStructures() {
        // Place main town near center
        const center = Math.floor(this.width / 2);
        this.placeTown(center, center, 3);

        // Place dungeons in corners
        const dungeonSpots = [
            { x: 15, y: 15 },
            { x: this.width - 15, y: 15 },
            { x: 15, y: this.height - 15 },
            { x: this.width - 15, y: this.height - 15 }
        ];

        dungeonSpots.forEach(pos => {
            this.placeDungeon(pos.x, pos.y);
        });

        // Place smaller outposts
        for (let i = 0; i < 3; i++) {
            const ox = 20 + Math.floor(Math.random() * (this.width - 40));
            const oy = 20 + Math.floor(Math.random() * (this.height - 40));
            if (this.isValidStructureLocation(ox, oy)) {
                this.placeTown(ox, oy, 1);
            }
        }
    }

    placeTown(cx, cy, radius) {
        let placed = false;
        let searchRadius = 0;

        while (!placed && searchRadius < 20) {
            for (let y = cy - searchRadius; y <= cy + searchRadius && !placed; y++) {
                for (let x = cx - searchRadius; x <= cx + searchRadius && !placed; x++) {
                    if (this.isValidStructureLocation(x, y)) {
                        // Place town tiles in radius
                        for (let dy = -radius; dy <= radius; dy++) {
                            for (let dx = -radius; dx <= radius; dx++) {
                                const tx = x + dx;
                                const ty = y + dy;
                                if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
                                    this.tiles[ty][tx].structure = 'town';
                                    this.tiles[ty][tx].biome = 'town';
                                    this.tiles[ty][tx].traversable = true;
                                }
                            }
                        }
                        this.structures.push({ type: 'town', x: x * this.tileSize, y: y * this.tileSize });
                        placed = true;
                    }
                }
            }
            searchRadius++;
        }
    }

    placeDungeon(cx, cy) {
        if (this.isValidStructureLocation(cx, cy)) {
            this.tiles[cy][cx].structure = 'dungeon';
            this.tiles[cy][cx].biome = 'dungeon';
            this.tiles[cy][cx].traversable = true;
            this.structures.push({ type: 'dungeon', x: cx * this.tileSize, y: cy * this.tileSize });
        }
    }

    isValidStructureLocation(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        const tile = this.tiles[y][x];
        return tile && tile.biome !== 'water' && tile.biome !== 'mountain';
    }

    // ==================== ENTITY SPAWNING ====================

    findValidSpawn() {
        let attempts = 0;
        while (attempts < 1000) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            if (this.tiles[y]?.[x]?.traversable && !this.tiles[y][x].structure) {
                return {
                    x: x * this.tileSize + this.tileSize / 2,
                    y: y * this.tileSize + this.tileSize / 2
                };
            }
            attempts++;
        }
        // Fallback to center area
        return {
            x: (this.width / 2) * this.tileSize,
            y: (this.height / 2) * this.tileSize
        };
    }

    findValidSpawnNearTown() {
        // Find a town structure
        const town = this.structures.find(s => s.type === 'town');
        if (!town) return this.findValidSpawn();

        // Spawn near it
        for (let i = 0; i < 100; i++) {
            const ox = town.x + (Math.random() - 0.5) * 200;
            const oy = town.y + (Math.random() - 0.5) * 200;
            const tx = Math.floor(ox / this.tileSize);
            const ty = Math.floor(oy / this.tileSize);
            if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height &&
                this.tiles[ty][tx].traversable) {
                return { x: ox, y: oy };
            }
        }
        return { x: town.x, y: town.y };
    }

    async spawnNPCs(count) {
        const worldContext = this.game.worldLore
            ? `${this.game.worldLore.worldName} - ${this.game.worldLore.description}`
            : 'A fantasy world';

        for (let i = 0; i < count; i++) {
            const pos = this.findValidSpawnNearTown();
            let aiData = null;

            if (this.game.ai.enabled) {
                const regionName = this.getRegionAt(pos.x, pos.y);
                aiData = await this.game.ai.generateNPC(worldContext, regionName);
                if (aiData) {
                    this.game.ui?.addGenLog(`NPC: ${aiData.name}`);
                }
            }

            const npc = new NPC(this.game, pos.x, pos.y, aiData);
            this.game.entities.push(npc);
        }
    }

    spawnEnemies(count) {
        const enemyTypeKeys = Object.keys(CONFIG.ENEMY_TYPES);

        for (let i = 0; i < count; i++) {
            const pos = this.findValidSpawn();
            const level = Math.max(1, Math.floor(Math.random() * 3) + 1);
            const typeKey = enemyTypeKeys[Math.floor(Math.random() * enemyTypeKeys.length)];
            const enemy = new Enemy(this.game, pos.x, pos.y, level, typeKey);
            this.game.entities.push(enemy);
        }
    }

    async spawnItems(count) {
        const types = ['weapon', 'armor', 'accessory', 'potion'];
        const rarities = ['common', 'common', 'uncommon', 'rare', 'epic'];

        for (let i = 0; i < count; i++) {
            const pos = this.findValidSpawn();
            const type = types[Math.floor(Math.random() * types.length)];
            const rarity = rarities[Math.floor(Math.random() * rarities.length)];

            let aiData = null;
            if (this.game.ai.enabled && type !== 'potion') {
                const worldCtx = this.game.worldLore
                    ? `${this.game.worldLore.worldName} - ${this.game.worldLore.description}`
                    : 'A fantasy world';
                aiData = await this.game.ai.generateItem(type, rarity, worldCtx);
                if (aiData) {
                    this.game.ui?.addGenLog(`Item: ${aiData.name} (${rarity})`);
                }
            }

            const item = new Item(this.game, pos.x, pos.y, type, aiData);
            if (!aiData) {
                item.rarity = rarity;
                item.color = item.getRarityColor(rarity);
            }
            this.game.entities.push(item);
        }
    }

    placeChests(count) {
        for (let i = 0; i < count; i++) {
            const pos = this.findValidSpawn();
            const chest = new Interactable(this.game, pos.x, pos.y, 'chest');
            this.game.entities.push(chest);
        }
    }

    async generateAIQuests(count) {
        if (!this.game.ai.enabled) return;

        for (let i = 0; i < count; i++) {
            const playerCtx = `Level ${this.game.player?.level || 1} ${this.game.selectedClass}`;
            const worldCtx = this.game.worldLore
                ? `${this.game.worldLore.worldName} - ${this.game.worldLore.description}`
                : 'A fantasy world';

            const questData = await this.game.ai.generateQuest(playerCtx, worldCtx);
            if (questData) {
                this.game.questSystem.add(questData);
                this.game.ui?.addGenLog(`Quest: ${questData.title}`);
            }
        }
    }

    getRegionAt(x, y) {
        const tile = this.getTile(x, y);
        if (!tile) return 'The Wilds';

        if (this.game.worldLore?.regions) {
            const region = this.game.worldLore.regions.find(r => r.biome === tile.biome);
            if (region) return region.name;
        }

        return tile.biome.charAt(0).toUpperCase() + tile.biome.slice(1);
    }

    // ==================== UPDATE ====================

    update(dt) {
        // Update time
        this.time += (dt / this.dayDuration) * 24;
        if (this.time >= 24) {
            this.time -= 24;
            this.day++;
            this.game.ui?.notify(`Day ${this.day} begins`, 'info');
        }

        // Update weather
        this.weatherTimer -= dt;
        if (this.weatherTimer <= 0) {
            this.changeWeather();
        }

        // Respawn enemies if too few
        const enemyCount = this.game.entities.filter(e => e.constructor.name === 'Enemy').length;
        if (enemyCount < 10 && Math.random() < 0.01) {
            this.spawnEnemies(1);
        }
    }

    changeWeather() {
        const types = Object.values(WEATHER_TYPES);
        // Weighted towards clear
        if (Math.random() < 0.4) {
            this.weather = WEATHER_TYPES.CLEAR;
        } else {
            this.weather = types[Math.floor(Math.random() * types.length)];
        }
        this.weatherTimer = 60 + Math.random() * 120;
        this.game.ui?.notify(`Weather: ${this.weather}`, 'info');
    }

    getAmbientLight() {
        // 0.0 = full dark, 1.0 = full light
        if (this.time < 4 || this.time > 20) return 0.15;
        if (this.time >= 6 && this.time <= 18) return 1.0;

        if (this.time >= 4 && this.time < 6) {
            return 0.15 + ((this.time - 4) / 2) * 0.85; // Dawn
        }
        if (this.time > 18 && this.time <= 20) {
            return 1.0 - ((this.time - 18) / 2) * 0.85; // Dusk
        }
        return 0.15;
    }

    // ==================== RENDERING ====================

    render(ctx, camera) {
        const startX = Math.floor(Math.max(0, camera.x / this.tileSize));
        const startY = Math.floor(Math.max(0, camera.y / this.tileSize));
        const endX = Math.min(this.width, startX + Math.ceil(this.game.width / this.tileSize) + 2);
        const endY = Math.min(this.height, startY + Math.ceil(this.game.height / this.tileSize) + 2);

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = this.tiles[y][x];
                const px = Math.floor(x * this.tileSize - camera.x);
                const py = Math.floor(y * this.tileSize - camera.y);

                // Base tile
                ctx.fillStyle = CONFIG.COLORS[tile.biome] || '#000';
                ctx.fillRect(px, py, this.tileSize, this.tileSize);

                // Subtle grid lines
                ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                ctx.strokeRect(px, py, this.tileSize, this.tileSize);

                // Structure markers
                if (tile.structure === 'town') {
                    ctx.fillStyle = 'rgba(212, 168, 83, 0.3)';
                    ctx.fillRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4);
                } else if (tile.structure === 'dungeon') {
                    ctx.fillStyle = 'rgba(90, 58, 106, 0.5)';
                    ctx.fillRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4);
                }
            }
        }
    }

    // ==================== COLLISION ====================

    checkCollision(x, y) {
        const tx = Math.floor(x / this.tileSize);
        const ty = Math.floor(y / this.tileSize);
        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return true;
        return !this.tiles[ty][tx].traversable;
    }

    getTile(x, y) {
        const tx = Math.floor(x / this.tileSize);
        const ty = Math.floor(y / this.tileSize);
        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return null;
        return this.tiles[ty][tx];
    }
}
