/**
 * Save/Load System - Persists game state to localStorage.
 */
export class SaveSystem {
    constructor(game) {
        this.game = game;
        this.key = 'aethelgard_save';
    }

    save() {
        if (!this.game.player) return;

        const p = this.game.player;
        const data = {
            player: {
                x: p.x,
                y: p.y,
                charName: p.charName,
                className: p.className,
                hp: p.hp,
                maxHp: p.maxHp,
                mp: p.mp,
                maxMp: p.maxMp,
                stamina: p.stamina,
                maxStamina: p.maxStamina,
                xp: p.xp,
                xpToNext: p.xpToNext,
                level: p.level,
                gold: p.gold,
                skillPoints: p.skillPoints,
                str: p.str,
                agi: p.agi,
                int: p.int,
                vit: p.vit,
                cha: p.cha,
                damage: p.baseDamage
            },
            inventory: this.game.inventory.items.map(i => ({
                type: i.type,
                name: i.name,
                rarity: i.rarity,
                value: i.value,
                stats: i.stats,
                description: i.description,
                lore: i.lore
            })),
            equipped: {
                weapon: this.serializeItem(this.game.inventory.equipped.weapon),
                armor: this.serializeItem(this.game.inventory.equipped.armor),
                accessory: this.serializeItem(this.game.inventory.equipped.accessory)
            },
            skills: this.game.skillTree.serialize(),
            quests: {
                active: this.game.questSystem.activeQuests,
                completed: this.game.questSystem.completedQuests
            },
            world: {
                seed: this.game.world.seed,
                day: this.game.world.day,
                time: this.game.world.time
            },
            worldLore: this.game.worldLore,
            selectedClass: this.game.selectedClass,
            settings: this.game.settings,
            timestamp: Date.now()
        };

        try {
            localStorage.setItem(this.key, JSON.stringify(data));
            this.game.ui.notify('Game Saved!', 'success');
            return true;
        } catch (e) {
            console.error('Save failed:', e);
            this.game.ui.notify('Save failed!', 'error');
            return false;
        }
    }

    load() {
        const saved = localStorage.getItem(this.key);
        if (!saved) {
            this.game.ui?.notify('No save found', 'error');
            return false;
        }

        try {
            const data = JSON.parse(saved);

            // Restore world
            this.game.selectedClass = data.selectedClass || 'warrior';
            this.game.worldSeed = data.world?.seed || '';
            this.game.worldLore = data.worldLore || this.game.generateFallbackLore();

            // Generate world
            this.game.world.seed = data.world?.seed || Math.random();
            this.game.world.generate();
            this.game.world.day = data.world?.day || 1;
            this.game.world.time = data.world?.time || 8;

            // Create player
            const px = data.player?.x || (50 * 40);
            const py = data.player?.y || (50 * 40);
            const stats = {
                str: data.player?.str || 5,
                agi: data.player?.agi || 5,
                int: data.player?.int || 5,
                vit: data.player?.vit || 5,
                cha: data.player?.cha || 5
            };

            // We need to import Player properly, but since save.js is a module,
            // we'll use the game's method to create the player
            this.game.player = null;
            this.game.entities = [];
            this.game.projectiles = [];
            this.game.particles = [];

            // Import Player dynamically
            import('../entities/player.js').then(({ Player }) => {
                this.game.player = new Player(
                    this.game, px, py,
                    data.selectedClass || 'warrior',
                    data.player?.charName || 'Hero',
                    stats
                );

                // Restore player stats
                const p = this.game.player;
                p.hp = data.player?.hp || p.maxHp;
                p.mp = data.player?.mp || p.maxMp;
                p.stamina = data.player?.stamina || p.maxStamina;
                p.xp = data.player?.xp || 0;
                p.xpToNext = data.player?.xpToNext || 100;
                p.level = data.player?.level || 1;
                p.gold = data.player?.gold || 0;
                p.skillPoints = data.player?.skillPoints || 0;

                // Restore inventory
                if (data.inventory) {
                    data.inventory.forEach(item => this.game.inventory.items.push(item));
                }
                if (data.equipped) {
                    if (data.equipped.weapon) this.game.inventory.equipped.weapon = data.equipped.weapon;
                    if (data.equipped.armor) this.game.inventory.equipped.armor = data.equipped.armor;
                    if (data.equipped.accessory) this.game.inventory.equipped.accessory = data.equipped.accessory;
                }

                // Restore skills
                if (data.skills) {
                    this.game.skillTree.deserialize(data.skills);
                }

                // Restore quests
                if (data.quests) {
                    this.game.questSystem.activeQuests = data.quests.active || [];
                    this.game.questSystem.completedQuests = data.quests.completed || [];
                }

                // Spawn world entities
                this.game.world.spawnNPCs(6);
                this.game.world.spawnEnemies(20);
                this.game.world.placeChests(10);

                this.game.state = 'playing';
                this.game.ui.showScreen('hud');
                this.game.ui.notify('Game Loaded!', 'success');
            });

            return true;
        } catch (e) {
            console.error('Load failed:', e);
            this.game.ui?.notify('Save file corrupted', 'error');
            return false;
        }
    }

    serializeItem(item) {
        if (!item) return null;
        return {
            type: item.type,
            name: item.name,
            rarity: item.rarity,
            value: item.value,
            stats: item.stats,
            description: item.description,
            lore: item.lore
        };
    }

    hasSave() {
        return !!localStorage.getItem(this.key);
    }

    deleteSave() {
        localStorage.removeItem(this.key);
    }
}
