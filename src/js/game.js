import { Input } from './systems/input.js';
import { Render } from './systems/render.js';
import { Player } from './entities/player.js';
import { World } from './world/world.js';
import { AIClient } from './systems/ai.js';
import { Physics } from './systems/physics.js';
import { Combat } from './systems/combat.js';
import { Dialogue } from './systems/dialogue.js';
import { Inventory } from './systems/inventory.js';
import { QuestSystem } from './systems/quest.js';
import { SkillTree } from './systems/skills.js';
import { UI } from './systems/ui.js';
import { SaveSystem } from './systems/save.js';
import { EventSystem } from './systems/events.js';
import { CONFIG } from './config.js';

/**
 * Game Core - Central hub for the game engine.
 * Manages all systems, entities, game state and the main loop.
 */
export class Game {
    constructor() {
        this.state = 'title'; // title, creation, loading, playing, paused, dead
        this.input = new Input();
        this.ai = new AIClient();

        // These systems need `this` (game) reference
        this.render = null;
        this.world = null;
        this.physics = null;
        this.combat = null;
        this.dialogue = null;
        this.inventory = null;
        this.questSystem = null;
        this.skillTree = null;
        this.ui = null;
        this.saveSystem = null;
        this.eventSystem = null;

        this.player = null;
        this.entities = [];
        this.projectiles = [];
        this.particles = [];
        this.running = false;
        this.lastTime = 0;
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // Character creation state
        this.selectedClass = 'warrior';
        this.charName = 'Hero';
        this.worldSeed = '';
        this.creationStats = { str: 5, agi: 5, int: 5, vit: 5, cha: 5 };
        this.statPoints = 10;

        // World lore (populated by AI or fallback)
        this.worldLore = null;

        // Selected hotbar slot
        this.selectedSlot = 0;

        // Settings
        this.settings = {
            musicVolume: 50,
            sfxVolume: 70,
            difficulty: 'normal',
            aiLength: 'medium'
        };
    }

    /**
     * Initialize all game systems. Called once on page load.
     */
    initSystems() {
        this.render = new Render(this);
        this.world = new World(this);
        this.physics = new Physics(this);
        this.combat = new Combat(this);
        this.dialogue = new Dialogue(this);
        this.inventory = new Inventory(this);
        this.questSystem = new QuestSystem(this);
        this.skillTree = new SkillTree(this);
        this.ui = new UI(this);
        this.saveSystem = new SaveSystem(this);
        this.eventSystem = new EventSystem(this);

        // Load settings
        const saved = localStorage.getItem('aethelgard_settings');
        if (saved) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            } catch (e) { /* ignore */ }
        }
        this.ui.applySettings(this.settings);

        // Start the render loop (always runs for title screen background)
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));

        console.log('Game systems initialized');
    }

    /**
     * Start a new game with the configured character and world.
     */
    async startNewGame() {
        this.state = 'loading';
        this.ui.showScreen('loading');
        this.ui.setLoadingProgress(0, 'Preparing world...');

        // Generate world terrain
        this.world.seed = this.worldSeed || Math.random().toString(36).substring(7);
        this.world.generate();
        this.ui.setLoadingProgress(20, 'Terrain generated...');

        // AI world lore generation
        if (this.ai.enabled) {
            this.ui.setLoadingProgress(25, 'AI is generating world lore...');
            this.worldLore = await this.ai.generateWorldLore(this.worldSeed);
        }
        if (!this.worldLore) {
            this.worldLore = this.generateFallbackLore();
        }
        this.ui.setLoadingProgress(40, 'World lore created...');

        // Create player
        const cx = CONFIG.WORLD_SIZE * CONFIG.TILE_SIZE / 2;
        const cy = CONFIG.WORLD_SIZE * CONFIG.TILE_SIZE / 2;
        this.player = new Player(this, cx, cy, this.selectedClass, this.charName, this.creationStats);
        this.ui.setLoadingProgress(50, 'Hero created...');

        // Reset entities
        this.entities = [];
        this.projectiles = [];
        this.particles = [];

        // Spawn NPCs
        this.ui.setLoadingProgress(55, 'Populating world with NPCs...');
        await this.world.spawnNPCs(6);
        this.ui.setLoadingProgress(65, 'NPCs ready...');

        // Spawn enemies
        this.ui.setLoadingProgress(70, 'Spawning creatures...');
        this.world.spawnEnemies(20);
        this.ui.setLoadingProgress(80, 'Enemies spawned...');

        // Generate items
        this.ui.setLoadingProgress(85, 'Scattering treasures...');
        await this.world.spawnItems(8);
        this.ui.setLoadingProgress(90, 'Items placed...');

        // Place interactables (chests)
        this.world.placeChests(10);
        this.ui.setLoadingProgress(95, 'World ready...');

        // Generate initial AI quests
        if (this.ai.enabled) {
            await this.world.generateAIQuests(3);
        }
        this.ui.setLoadingProgress(100, 'Adventure begins!');

        // Small delay for dramatic effect
        await this.delay(500);

        this.state = 'playing';
        this.ui.showScreen('hud');
        this.ui.notify('Welcome to ' + (this.worldLore.worldName || 'Aethelgard') + '!', 'info');
        this.ui.addChatMessage('system', 'System', this.worldLore.description || 'Your adventure begins.');
    }

    /**
     * Load a saved game.
     */
    loadGame() {
        if (this.saveSystem.load()) {
            this.state = 'playing';
            this.ui.showScreen('hud');
        }
    }

    /**
     * Main game loop.
     */
    loop(timestamp) {
        if (!this.running) return;

        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        if (this.state === 'playing') {
            this.update(dt);
        }

        this.render.update(dt);
        this.ui.update(dt);

        requestAnimationFrame((t) => this.loop(t));
    }

    /**
     * Update all game logic.
     */
    update(dt) {
        if (!this.player || this.state !== 'playing') return;

        this.player.update(dt);
        this.world.update(dt);
        this.eventSystem.update(dt);

        // Update entities
        for (let i = this.entities.length - 1; i >= 0; i--) {
            this.entities[i].update(dt);
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.projectiles[i].update(dt);
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].life -= dt;
            this.particles[i].x += this.particles[i].vx * dt;
            this.particles[i].y += this.particles[i].vy * dt;
            this.particles[i].alpha = Math.max(0, this.particles[i].life / this.particles[i].maxLife);
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Cleanup dead entities and inactive projectiles
        this.entities = this.entities.filter(e => (e.hp !== undefined ? e.hp > 0 : true) || e.active);
        this.projectiles = this.projectiles.filter(p => p.active);

        // Physics
        this.physics.update(dt);
    }

    /**
     * Spawn a visual particle effect.
     */
    spawnParticle(x, y, color, speed, life) {
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * speed;
        this.particles.push({
            x, y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            color,
            life,
            maxLife: life,
            alpha: 1,
            radius: 2 + Math.random() * 3
        });
    }

    /**
     * Spawn multiple particles.
     */
    spawnParticles(x, y, color, count, speed, life) {
        for (let i = 0; i < count; i++) {
            this.spawnParticle(x, y, color, speed || 100, life || 0.5);
        }
    }

    /**
     * Check if a world position collides with terrain.
     */
    checkCollision(x, y) {
        return this.world.checkCollision(x, y);
    }

    /**
     * Generate fallback lore when AI is unavailable.
     */
    generateFallbackLore() {
        const names = ['Aethelgard', 'Velmoria', 'Drakenmoor', 'Sunhaven', 'Frostholm'];
        const descriptions = [
            'A realm of ancient magic and forgotten kingdoms.',
            'Lands torn between warring factions and dark forces.',
            'A world where dragons once ruled the skies.',
            'Peace-loving realms threatened by shadows from the deep.',
            'Frozen wastes hiding secrets of a lost civilization.'
        ];
        const idx = Math.floor(Math.random() * names.length);
        return {
            worldName: names[idx],
            description: descriptions[idx],
            theme: 'medieval fantasy',
            regions: [
                { name: 'The Grasslands', description: 'Rolling green hills', biome: 'grass' },
                { name: 'The Dark Forest', description: 'Ancient trees blot the sun', biome: 'forest' },
                { name: 'Iron Peaks', description: 'Treacherous mountain passes', biome: 'mountain' },
                { name: 'Crystal Lake', description: 'Shimmering waters', biome: 'water' },
                { name: 'The Frozen North', description: 'Endless snow and ice', biome: 'snow' }
            ],
            history: 'Long ago, great heroes defended these lands from darkness.',
            conflicts: ['The Shadow Cult rises', 'Border disputes between kingdoms'],
            factions: [
                { name: 'The Silver Guard', description: 'Protectors of the realm' },
                { name: 'The Shadow Cult', description: 'Seekers of forbidden power' }
            ]
        };
    }

    /**
     * Utility delay.
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Save settings to localStorage.
     */
    saveSettings() {
        localStorage.setItem('aethelgard_settings', JSON.stringify(this.settings));
    }
}
