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
import { CONFIG } from './config.js';

export class Game {
    constructor() {
        this.input = new Input();
        this.render = new Render(this);
        this.world = new World(this);
        this.ai = new AIClient();
        this.physics = new Physics(this);
        this.combat = new Combat(this);
        this.dialogue = new Dialogue(this);
        this.inventory = new Inventory(this);
        this.questSystem = new QuestSystem(this);
        this.skillTree = new SkillTree(this);
        this.ui = new UI(this);
        this.saveSystem = new SaveSystem(this);

        this.player = null;
        this.entities = [];
        this.projectiles = [];
        this.particles = [];
        this.quests = []; // To match quest system array
        this.running = false;
        this.lastTime = 0;
    }

    init() {
        // Initialize AI client status
        if (this.ai.enabled) {
            console.log('AI System Online');
        } else {
            console.warn('AI System Offline - No API Key');
        }

        this.world.generate();
        this.player = new Player(this, CONFIG.WORLD_SIZE * CONFIG.TILE_SIZE / 2, CONFIG.WORLD_SIZE * CONFIG.TILE_SIZE / 2);
        this.running = true;
        this.loop(0);
        console.log('Game initialized');
        this.ui.notify('Welcome to Aethelgard!', 'info');
    }

    loop(timestamp) {
        if (!this.running) return;

        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1); // Cap dt
        this.lastTime = timestamp;

        this.update(dt);
        this.render.update(dt);
        this.ui.update(dt);

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        if (this.player) this.player.update(dt);

        // Update entities
        this.entities.forEach(entity => entity.update(dt));
        this.projectiles.forEach(p => p.update(dt));

        // Cleanup dead/inactive
        this.entities = this.entities.filter(e => e.hp > 0);
        this.projectiles = this.projectiles.filter(p => p.active);

        // Physics
        this.physics.update(dt);
    }

    checkCollision(x, y) {
        return this.world.checkCollision(x, y);
    }
}
